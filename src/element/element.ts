import { bus, type Constructor, type Handler } from "../bus";
import { type LoomEvent } from "../event";
import { type CSSValue, adoptCSS } from "../css";
import { COMPUTED_DIRTY, REACTIVES, getConnectHooks, FIRST_UPDATED_HOOKS } from "../decorators/symbols";
import { morph } from "../morph";
import { app } from "../app";
import { startTrace, endTrace, hasDirtyDeps, canFastPatch, applyBindings, refreshSnapshots, releaseTrace, type TraceDeps } from "../trace";
import { hasRegisteredAttributes, observeAttributes } from "./attribute";

/**
 * Structural type for objects that support Loom's render scheduling.
 *
 * `force` bypasses the trace-based skip checks. Pass it when the state that
 * changed is NOT backed by a `Reactive` — context values, media queries, slot
 * assignments — because the dirty-dependency check has no way to see those and
 * would drop the render.
 */
export interface Schedulable {
  scheduleUpdate?: (force?: boolean) => void;
}

export abstract class LoomElement extends HTMLElement {
  /** Access the LoomApp instance for inline provider resolution */
  protected get app() { return app; }

  protected shadow: ShadowRoot;
  private cleanups: (() => void)[] = [];
  /** @internal — dependency tracking for traced template projection */
  __traceDeps: TraceDeps | null = null;
  /**
   * @internal — callbacks run after every render pass (fast-patch, first
   * render and full render alike). Used by @portal to mount teleported output
   * without monkey-patching _flushUpdate. Undefined until something registers.
   */
  __afterUpdate?: Array<() => void>;

  constructor() {
    super();
    if ((this.constructor as unknown as Record<string, unknown>).__loom_noshadow) {
      // Light DOM mode — render directly into the host element.
      // Cast to ShadowRoot so all existing code (morph, $, $$, css) works unchanged.
      this.shadow = this as unknown as ShadowRoot;
    } else if (this.shadowRoot) {
      // Declarative Shadow DOM — browser already created a shadow root
      // from <template shadowrootmode="open"> in the HTML.
      // Reuse it instead of calling attachShadow (which would throw).
      this.shadow = this.shadowRoot;
    } else {
      this.shadow = this.attachShadow({ mode: "open" });
    }
  }

  // ── CSS ──

  /** Adopt styles — supports both tagged template and string */
  protected css(text: string): void;
  protected css(strings: TemplateStringsArray, ...values: CSSValue[]): void;
  protected css(
    stringsOrText: string | TemplateStringsArray,
    ...values: CSSValue[]
  ): void {
    adoptCSS(this.shadow, stringsOrText, ...values);
  }

  /**
   * Adopt external CSSStyleSheets into this component's shadow root.
   * Used by the router outlet to pass inherited styles down.
   * Deduplicates — sheets already present are skipped.
   */
  adoptStyles(sheets: CSSStyleSheet[]): void {
    const existing = this.shadow.adoptedStyleSheets;
    const have = new Set(existing);
    const toAdd: CSSStyleSheet[] = [];
    for (let i = 0; i < sheets.length; i++) {
      const s = sheets[i];
      if (!have.has(s)) {
        have.add(s);
        toAdd.push(s);
      }
    }
    if (toAdd.length > 0) {
      this.shadow.adoptedStyleSheets = existing.concat(toAdd);
    }
  }

  // ── Event helpers ──

  /** Subscribe to a typed event — auto-cleaned on disconnect */
  protected on<T>(type: Constructor<T>, handler: Handler<T>): () => void {
    const unsub = bus.on(type, handler);
    this.cleanups.push(unsub);
    return unsub;
  }

  /** Emit a typed event */
  protected emit<T extends LoomEvent>(event: T): void {
    bus.emit(event);
  }

  // ── Cleanup tracking ──

  /** Track any cleanup function — runs on disconnect */
  track(unsub: () => void): void {
    this.cleanups.push(unsub);
  }

  // ── DOM queries ──

  /** querySelector within shadow root */
  protected $<T extends Element = HTMLElement>(sel: string): T | null {
    return this.shadow.querySelector<T>(sel);
  }

  /** querySelectorAll within shadow root */
  protected $$<T extends Element = HTMLElement>(sel: string): T[] {
    return Array.from(this.shadow.querySelectorAll<T>(sel));
  }

  // ── Lifecycle ──

  connectedCallback(): void {
    // Run decorator-registered connect hooks (from @mount, @interval, @watch, etc.)
    const hooks = getConnectHooks(this);
    if (hooks) {
      for (let i = 0; i < hooks.length; i++) {
        const cleanup = hooks[i](this);
        if (typeof cleanup === "function") this.cleanups.push(cleanup);
      }
    }

    // Trigger initial render for reactive components
    const hasReactives = ((REACTIVES.from(this.constructor as object) as string[] | undefined)?.length ?? 0) > 0;
    const overridesUpdate = this.update !== LoomElement.prototype.update;
    if (hasReactives || overridesUpdate) this.scheduleUpdate();

    // Wire @attribute controllers within this component's shadow root.
    // Gated on the global flag so unused-feature cost is a single boolean.
    if (hasRegisteredAttributes) {
      this.cleanups.push(observeAttributes(this.shadow));
    }
  }

  disconnectedCallback(): void {
    // Swap the list out FIRST: a throwing cleanup must not skip the rest, and
    // must not leave them queued to run a second time on the next disconnect.
    // A cleanup that calls track() lands in the fresh array, not this one.
    const cleanups = this.cleanups;
    this.cleanups = [];
    for (let i = 0; i < cleanups.length; i++) {
      try {
        cleanups[i]();
      } catch (e) {
        console.error("[Loom] cleanup threw during disconnect", e);
      }
    }
    // Release trace deps back to pool
    if (this.__traceDeps) {
      releaseTrace(this.__traceDeps);
      this.__traceDeps = null;
    }
  }

  // ── Lifecycle hooks (override in subclass) ──

  /**
   * Batched re-render. Fires once per microtask when any @reactive/@prop changes.
   * Override this to render your component.
   */
  update(): Node | Node[] | void { }

  /**
   * Called after the very first update(). DOM is guaranteed to exist.
   * Perfect for wiring up canvas, charts, third-party libs, or initial focus.
   */
  firstUpdated(): void { }

  /**
   * Return false to skip this render cycle. Called before each update().
   * Default: always renders.
   */
  shouldUpdate(): boolean {
    return true;
  }

  // ── Batching internals ──

  private _updateScheduled = false;
  private _hasUpdated = false;
  private _forceUpdate = false;

  private _flushUpdate = (): void => {
    this._updateScheduled = false;
    // Consume the force flag before shouldUpdate() so an explicit
    // `shouldUpdate() === false` still wins — that is the documented opt-out.
    const forced = this._forceUpdate;
    this._forceUpdate = false;
    // Skip shouldUpdate() call if not overridden (avoids virtual method dispatch)
    if (this.shouldUpdate !== LoomElement.prototype.shouldUpdate && !this.shouldUpdate()) return;

    // Tier 1 — SKIP: no traced dependency changed.
    // hasDirtyDeps only sees Reactive versions, and returns false for an empty
    // version map, so a component driven purely by non-Reactive state (@consume,
    // @media, @fullscreen, @slot, @suspend) would never render again after its
    // first paint. Those callers pass force.
    if (!forced && this.__traceDeps && !hasDirtyDeps(this.__traceDeps)) return;

    // Tier 2 — FAST PATCH: all dirty deps have bindings
    if (!forced && this.__traceDeps && canFastPatch(this.__traceDeps)) {
      const dirtyKeys = COMPUTED_DIRTY.from(this) as symbol[] | undefined;
      if (dirtyKeys) {
        for (let i = 0; i < dirtyKeys.length; i++) {
          (this as unknown as Record<symbol, boolean>)[dirtyKeys[i]] = true;
        }
      }
      applyBindings(this.__traceDeps);
      refreshSnapshots(this.__traceDeps);
      this._runAfterUpdate();
      return;
    }

    // First render: fast append (no morph diffing against empty shadow root)
    if (!this._hasUpdated) {
      this._firstRender();
      return;
    }

    this._fullRender();
  };

  /**
   * Called by @reactive setters — batches via microtask.
   *
   * @param force Bypass the trace-based skip/fast-patch checks. Required when
   *   the changed state is not backed by a `Reactive`, since the dirty-check
   *   cannot observe it. `shouldUpdate()` still applies.
   */
  scheduleUpdate(force = false): void {
    if (force) this._forceUpdate = true;
    if (this._updateScheduled) return;
    this._updateScheduled = true;
    queueMicrotask(this._flushUpdate);
  }

  /**
   * Synchronous first render — skips microtask deferral and morph diffing.
   * Shadow root is empty so we appendChild directly instead of diffing.
   */
  private _firstRender(): void {
    // No shouldUpdate() check here: _firstRender is only reachable from
    // _flushUpdate, which already called it. Calling it twice per first render
    // broke side-effecting overrides — LoomVirtual.shouldUpdate() calls
    // invalidate(), so every measurement pass was thrown away twice.
    startTrace();
    const result = this.update();
    // Capture trace BEFORE appendChild — appendChild triggers child connectedCallback
    // which would call startTrace() and clobber our module-level trace state.
    if (this.__traceDeps) releaseTrace(this.__traceDeps);
    this.__traceDeps = endTrace();

    // Fast append — shadow root is empty, no need to diff
    if (result != null) {
      // Hydration: if shadow root already has content (from Declarative Shadow DOM),
      // morph against it to wire up event listeners and trace bindings without
      // destroying the pre-rendered DOM. When DSD HTML matches update() output,
      // morph is a no-op diff — zero DOM mutations.
      const hasExistingContent = this.shadow.childNodes.length > 0;
      if (hasExistingContent) {
        morph(this.shadow, result);
      } else if (Array.isArray(result)) {
        // Batch append via fragment — one reflow instead of N
        const frag = document.createDocumentFragment();
        for (let i = 0; i < result.length; i++) frag.appendChild(result[i]);
        this.shadow.appendChild(frag);
      } else {
        this.shadow.appendChild(result);
      }
    }

    this._hasUpdated = true;
    this.firstUpdated();
    const hooks = FIRST_UPDATED_HOOKS.from(this) as Array<(el: LoomElement) => (() => void) | void> | undefined;
    if (hooks) {
      for (let i = 0; i < hooks.length; i++) {
        const cleanup = hooks[i](this);
        if (typeof cleanup === "function") this.cleanups.push(cleanup);
      }
    }
    this._runAfterUpdate();
  }

  /**
   * Full render with morph diffing — used for subsequent updates.
   */
  private _fullRender(): void {
    // Dirty all @computed caches
    const dirtyKeys = COMPUTED_DIRTY.from(this) as symbol[] | undefined;
    if (dirtyKeys) {
      for (let i = 0; i < dirtyKeys.length; i++) {
        (this as unknown as Record<symbol, boolean>)[dirtyKeys[i]] = true;
      }
    }

    // Trace reactive reads during update()
    startTrace();
    const result = this.update();
    // Capture trace BEFORE morph — morph triggers child connectedCallback
    // which would call startTrace() and clobber our module-level trace state.
    if (this.__traceDeps) releaseTrace(this.__traceDeps);
    this.__traceDeps = endTrace();

    // Auto-morph if update() returned DOM nodes
    if (result != null) {
      morph(this.shadow, result);
    }

    if (!this._hasUpdated) {
      this._hasUpdated = true;
      this.firstUpdated();
      // Run decorator-registered first-updated hooks (from @form, etc.)
      // These fire after the first morph(), so shadow DOM content exists.
      const fuhooks = FIRST_UPDATED_HOOKS.from(this) as Array<(el: LoomElement) => (() => void) | void> | undefined;
      if (fuhooks) {
        for (let i = 0; i < fuhooks.length; i++) {
          const cleanup = fuhooks[i](this);
          if (typeof cleanup === "function") this.cleanups.push(cleanup);
        }
      }
    }

    this._runAfterUpdate();
  }

  /**
   * @internal — run post-render callbacks registered in __afterUpdate.
   *
   * Hooks may remove themselves (that is exactly what @portal's cleanup does),
   * which shifts the array underneath the loop. Rewinding by however many
   * entries disappeared keeps registration order without allocating a
   * snapshot on every render.
   */
  private _runAfterUpdate(): void {
    const hooks = this.__afterUpdate;
    if (!hooks) return;
    for (let i = 0; i < hooks.length; i++) {
      const lengthBefore = hooks.length;
      try {
        hooks[i]();
      } catch (e) {
        console.error("[Loom] afterUpdate hook threw", e);
      }
      const removed = lengthBefore - hooks.length;
      if (removed > 0) i -= removed;
    }
  }

  /**
   * Re-run lifecycle from scratch (after @catch error).
   * Cleans up, then re-connects.
   */
  retry(): void {
    this.disconnectedCallback();
    this._hasUpdated = false;
    this.connectedCallback();
  }
}
