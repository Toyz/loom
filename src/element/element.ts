import { bus, type Constructor, type Handler } from "../bus";
import { type LoomEvent } from "../event";
import { type CSSValue, adoptCSS } from "../css";
import { COMPUTED_DIRTY, REACTIVES, CONNECT_HOOKS, FIRST_UPDATED_HOOKS } from "../decorators/symbols";
import { morph } from "../morph";
import { app } from "../app";
import { startTrace, endTrace, hasDirtyDeps, canFastPatch, applyBindings, refreshSnapshots, type TraceDeps } from "../trace";

export abstract class LoomElement extends HTMLElement {
  /** Access the LoomApp instance for inline provider resolution */
  protected get app() { return app; }

  protected shadow: ShadowRoot;
  private cleanups: (() => void)[] = [];
  /** @internal — dependency tracking for traced template projection */
  __traceDeps: TraceDeps | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
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
    const newSheets = sheets.filter(s => !existing.includes(s));
    if (newSheets.length > 0) {
      this.shadow.adoptedStyleSheets = [...existing, ...newSheets];
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
    for (const hook of ((this as any)[CONNECT_HOOKS] ?? [])) {
      const cleanup = hook(this);
      if (typeof cleanup === "function") this.cleanups.push(cleanup);
    }

    // Trigger initial render for reactive components
    const hasReactives = ((this as any)[REACTIVES]?.length ?? 0) > 0;
    const overridesUpdate = this.update !== LoomElement.prototype.update;
    if (hasReactives || overridesUpdate) this.scheduleUpdate();
  }

  disconnectedCallback(): void {
    // Run all track() cleanups (includes decorator-registered cleanups)
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
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

  /** Called by @reactive setters — batches via microtask */
  scheduleUpdate(): void {
    if (this._updateScheduled) return;
    this._updateScheduled = true;
    queueMicrotask(() => {
      this._updateScheduled = false;
      if (!this.shouldUpdate()) return;

      // Tier 1 — SKIP: no traced dependency changed
      if (this.__traceDeps && !hasDirtyDeps(this.__traceDeps)) return;

      // Tier 2 — FAST PATCH: all dirty deps have bindings
      if (this.__traceDeps && canFastPatch(this.__traceDeps)) {
        // Dirty @computed caches (they may depend on a fast-patched reactive)
        for (const dirtyKey of (this as any)[COMPUTED_DIRTY] ?? []) {
          (this as any)[dirtyKey] = true;
        }
        applyBindings(this.__traceDeps);
        refreshSnapshots(this.__traceDeps);
        return;
      }

      // Tier 3 — FULL MORPH: structural change or first render
      // Dirty all @computed caches
      for (const dirtyKey of (this as any)[COMPUTED_DIRTY] ?? []) {
        (this as any)[dirtyKey] = true;
      }

      // Trace reactive reads during update()
      startTrace();
      const result = this.update();

      // Auto-morph if update() returned DOM nodes
      if (result != null) {
        morph(this.shadow, result);
      }

      // Capture/refresh dependency tracking + bindings
      this.__traceDeps = endTrace();

      if (!this._hasUpdated) {
        this._hasUpdated = true;
        this.firstUpdated();
        // Run decorator-registered first-updated hooks (from @form, etc.)
        // These fire after the first morph(), so shadow DOM content exists.
        for (const hook of ((this as any)[FIRST_UPDATED_HOOKS] ?? [])) {
          const cleanup = hook(this);
          if (typeof cleanup === "function") this.cleanups.push(cleanup);
        }
      }
    });
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
