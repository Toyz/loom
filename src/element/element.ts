import { bus, type Constructor, type Handler } from "../bus";
import { type LoomEvent } from "../event";
import { type CSSValue, adoptCSS } from "../css";
import { COMPUTED_DIRTY, REACTIVES } from "../decorators/symbols";
import { morph } from "../morph";
import { app } from "../app";

export abstract class LoomElement extends HTMLElement {
  /** Access the LoomApp instance for inline provider resolution */
  protected get app() { return app; }

  protected shadow: ShadowRoot;
  private cleanups: (() => void)[] = [];

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
    // Decorators self-wire via createDecorator's connectedCallback chain.
    // We only need to trigger the initial render for reactive components.
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
  update(): Node | Node[] | void {}

  /**
   * Called after the very first update(). DOM is guaranteed to exist.
   * Perfect for wiring up canvas, charts, third-party libs, or initial focus.
   */
  firstUpdated(): void {}

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
      // Dirty all @computed caches
      for (const dirtyKey of (this as any)[COMPUTED_DIRTY] ?? []) {
        (this as any)[dirtyKey] = true;
      }
      const result = this.update();
      // Auto-morph if update() returned DOM nodes
      if (result != null) {
        morph(this.shadow, result);
      }
      if (!this._hasUpdated) {
        this._hasUpdated = true;
        this.firstUpdated();
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
