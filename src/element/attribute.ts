/**
 * Loom — Attribute controllers (TC39 Stage 3)
 *
 * `LoomAttribute` is to attributes what `LoomElement` is to tags. Instead of
 * registering a custom element (`@component("my-el")`), you register a custom
 * *attribute* (`@attribute("data-tooltip")`). Whenever an element gains that
 * attribute — whether rendered by Loom's JSX, hydrated from Declarative Shadow
 * DOM, or hand-written in HTML — Loom instantiates a controller bound to that
 * element and drives its lifecycle.
 *
 * ```ts
 * @attribute("data-tooltip")
 * class Tooltip extends LoomAttribute {
 *   connect() {
 *     this.el.classList.add("tooltip");
 *     this.el.setAttribute("aria-label", this.value);
 *   }
 *   valueChanged(_old: string, next: string) {
 *     this.el.setAttribute("aria-label", next);
 *   }
 *   disconnect() {
 *     this.el.classList.remove("tooltip");
 *   }
 * }
 * ```
 *
 * Lifecycle (mirrors LoomElement):
 *   connect()                       — attribute appeared on a connected element
 *   valueChanged(old, next)         — attribute value was patched
 *   disconnect()                    — attribute removed, or element left the DOM
 *
 * Timing / watch / event decorators that route through CONNECT_HOOKS
 * (@interval, @timeout, @debounce, @throttle, @watch, @on, @log, …) work on
 * attribute controllers because the base runs those hooks on connect. Shadow-
 * DOM / render decorators (@styles, @query, @dynamicCss, @slot, @form, @portal,
 * and update()/morph) do NOT apply — an attribute controller has no shadow root
 * and produces no template.
 */

import { bus, type Constructor, type Handler } from "../bus";
import { type LoomEvent } from "../event";
import { app, type LoomApp } from "../app";
import { CONNECT_HOOKS } from "../decorators/symbols";
import { createDecorator } from "../decorators/create";
import { pendingProps } from "../store/decorators";
import { morph } from "../morph";
import { adoptCSS, type CSSValue } from "../css";

// ── Registry ──

type AttributeCtor = new () => LoomAttribute<unknown>;

/**
 * Where a controller's `update()` output mounts. A CSS selector string, a live
 * node, or a resolver called with the host element + controller.
 */
export type PortalTarget =
  | string
  | ParentNode
  | ((el: HTMLElement, self: LoomAttribute<unknown>) => string | ParentNode);

/** Options for `@attribute(name, opts)`. */
export interface AttributeOptions {
  /** Default portal target for `update()` output. Overridable per-instance via `this.to`. */
  target?: PortalTarget;
}

/** Coerce a PortalTarget to a live node (selector → querySelector, else body). */
function coerceTarget(t: string | ParentNode | null | undefined): ParentNode {
  if (t == null) return document.body;
  if (typeof t === "string") return document.querySelector(t) ?? document.body;
  return t;
}

/** name → controller constructor */
const registry = new Map<string, AttributeCtor>();

/**
 * Fast global gate. Stays `false` until the first `@attribute` is registered,
 * so LoomElement's connect path pays only a single boolean check when the
 * feature is unused.
 */
export let hasRegisteredAttributes = false;

/** Per-element controller instances, keyed by attribute name. */
const instances = new WeakMap<Element, Map<string, LoomAttribute<unknown>>>();

/** Expando key: raw JSX-passed values, keyed by attribute name. */
const ATTR_ARGS = "__loomAttrArgs";

interface AttrArgHost { [ATTR_ARGS]?: Record<string, unknown>; }

/** Is `name` a registered custom attribute? Hot-path helper for the JSX runtime. */
export function isRegisteredAttr(name: string): boolean {
  return registry.has(name);
}

/**
 * Bridge a JSX prop to a custom-attribute controller. Sets a marker attribute
 * (so the MutationObserver and morph both see it) and stashes the raw value —
 * function, object, boolean, string — for the controller to read as `this.arg`.
 *
 * Called by the JSX runtime for `<div sticky intersect={load} shortcut="j">`.
 */
export function setAttrArg(el: Element, name: string, val: unknown): void {
  if (val == null || val === false) {
    el.removeAttribute(name);
  } else if (typeof val === "string" || typeof val === "number") {
    el.setAttribute(name, String(val));
  } else {
    // Function / object / `true` → presence-only marker; value lives in the arg.
    el.setAttribute(name, "");
  }
  const host = el as AttrArgHost;
  let args = host[ATTR_ARGS];
  if (!args) { args = Object.create(null) as Record<string, unknown>; host[ATTR_ARGS] = args; }
  args[name] = val;
}

/** Read the stashed rich arg for `name`, falling back to the string value. */
function readArg(el: Element, name: string, value: string): unknown {
  const args = (el as AttrArgHost)[ATTR_ARGS];
  if (args && name in args) return args[name];
  return value;
}

/** Roots we've already attached an observer to (dedupe re-observation). */
const observedRoots = new WeakMap<Node, MutationObserver>();

// ── Base class ──

export abstract class LoomAttribute<A = string> {
  /** The element carrying the attribute. */
  el!: HTMLElement;
  /** The attribute name this controller is bound to (e.g. "data-tooltip"). */
  name!: string;
  /** Current attribute *string* value. Updated *before* valueChanged() fires. */
  value = "";
  /**
   * The rich value passed through JSX, e.g. `intersect={load}` → `this.arg`
   * is the `load` function. For plain string / hand-written HTML attributes
   * (`shortcut="j"`), `arg` equals `value`. Captured at connect time; typed
   * via the class generic (`LoomAttribute<() => void>`).
   */
  arg!: A;

  /**
   * Runtime portal target — set via a JSX arg key (`<div tooltip={{ to: "#modal" }}>`)
   * or imperatively (`this.to = el`). Highest precedence; re-resolved on every
   * render, so the mounted output moves if this changes. Null → fall back to the
   * `@attribute({ target })` option, then `get target()`, then `document.body`.
   */
  to: PortalTarget | null = null;

  /** Access the LoomApp instance for inline provider resolution. */
  protected get app(): LoomApp { return app; }

  private cleanups: (() => void)[] = [];

  // ── Lifecycle hooks (override in subclass) ──

  /** Attribute appeared on a connected element. */
  connect(): void {}

  /** Attribute value was patched. Called after `this.value` is updated. */
  valueChanged(_old: string, _next: string): void {}

  /** Attribute removed, or the element left the DOM. */
  disconnect(): void {}

  // ── Rendering (portal) ──

  /**
   * Render JSX/DOM into `this.target`. An attribute controller is a full
   * component wrapped onto a foreign host element — like a smart portal.
   *
   * Runs once at connect, then re-runs (morph-diffed) whenever a `@reactive`
   * or `@prop` field it reads changes. Return `void` for behavior-only
   * controllers that touch `this.el` directly.
   *
   * ```ts
   * @attribute("tooltip")
   * class Tooltip extends LoomAttribute {
   *   @prop accessor text = "";
   *   update() { return <div class="bubble">{this.text}</div>; }
   * }
   * // <button tooltip={{ text: "Save" }}>  → bubble mounted into document.body
   * ```
   */
  update(): Node | Node[] | void {}

  /**
   * Code-level default portal target — lowest precedence override hook.
   * Defaults to `document.body`. For a host-anchored portal:
   * `get target() { return this.el; }`. Prefer the `@attribute({ target })`
   * option or the runtime `this.to` prop when possible.
   */
  protected get target(): ParentNode { return document.body; }

  /** Resolve the effective portal target: `to` → option → `get target()`. */
  private _resolveTarget(): ParentNode {
    if (this.to != null) {
      const t = typeof this.to === "function" ? this.to(this.el, this) : this.to;
      return coerceTarget(t);
    }
    const opt = (this.constructor as unknown as { __loom_attr_target?: PortalTarget }).__loom_attr_target;
    if (opt != null) {
      const t = typeof opt === "function" ? opt(this.el, this) : opt;
      return coerceTarget(t);
    }
    return this.target;
  }

  /**
   * The shadow root of this controller's rendered output. Mirrors
   * `LoomElement.shadow` — `@query`, `@styles`, `@dynamicCss`, and `css()` all
   * operate on it. Exists only once the controller renders (update() overridden
   * or `@styles` present). Global (`:root`) theme variables inherit into it.
   */
  shadow!: ShadowRoot;

  /** The host `<div>` carrying the shadow root — teleported to the portal target. */
  private _shadowHost: HTMLElement | null = null;
  private _renderScheduled = false;

  /** Create the shadow host + root and mount it at the resolved target. */
  private _ensureShadow(): void {
    if (this.shadow) return;
    const host = document.createElement("div");
    host.setAttribute("data-loom-attr", this.name);
    this.shadow = host.attachShadow({ mode: "open" });
    this._shadowHost = host;
    this._resolveTarget().appendChild(host);
    this.cleanups.push(() => {
      host.remove();
      this._shadowHost = null;
      (this as { shadow?: ShadowRoot }).shadow = undefined;
    });
  }

  /** Adopt scoped styles into the render shadow root (mirrors LoomElement.css). */
  protected css(text: string): void;
  protected css(strings: TemplateStringsArray, ...values: CSSValue[]): void;
  protected css(stringsOrText: string | TemplateStringsArray, ...values: CSSValue[]): void {
    this._ensureShadow();
    adoptCSS(this.shadow, stringsOrText as TemplateStringsArray, ...values);
  }

  /** querySelector within the render shadow root. */
  protected $<T extends Element = HTMLElement>(sel: string): T | null {
    return this.shadow ? this.shadow.querySelector<T>(sel) : null;
  }

  /** querySelectorAll within the render shadow root. */
  protected $$<T extends Element = HTMLElement>(sel: string): T[] {
    return this.shadow ? Array.from(this.shadow.querySelectorAll<T>(sel)) : [];
  }

  /** Force a re-render of `update()` output. Usually automatic via reactivity. */
  protected rerender(): void {
    this._ensureShadow();
    const dest = this._resolveTarget();
    if (this._shadowHost!.parentNode !== dest) {
      // Portal target changed at runtime — relocate the mounted output.
      dest.appendChild(this._shadowHost!);
    }
    const out = this.update();
    // Keep the shadow (and its adopted styles) mounted; empty output just
    // clears the content so hover-toggle style controllers don't re-adopt CSS.
    morph(this.shadow, out == null ? [] : out);
  }

  private _scheduleRender = (): void => {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    queueMicrotask(() => { this._renderScheduled = false; this.rerender(); });
  };

  // ── Helpers (mirror LoomElement) ──

  /** Subscribe to a typed bus event — auto-cleaned on disconnect. */
  protected on<T>(type: Constructor<T>, handler: Handler<T>): () => void {
    const unsub = bus.on(type, handler);
    this.cleanups.push(unsub);
    return unsub;
  }

  /** Emit a typed bus event. */
  protected emit<T extends LoomEvent>(event: T): void {
    bus.emit(event);
  }

  /** Track any cleanup function — runs on disconnect. */
  track(unsub: () => void): void {
    this.cleanups.push(unsub);
  }

  // ── Internal lifecycle driver ──

  /** @internal — run connect() + CONNECT_HOOKS-registered decorators. */
  __mount(): void {
    const renders = this.update !== LoomAttribute.prototype.update;
    // @styles patches the prototype's connectedCallback to adopt sheets into
    // `this.shadow`. Ensure the shadow exists first, then fire it.
    const connectedCb = (this as { connectedCallback?: () => void }).connectedCallback;
    if (renders || typeof connectedCb === "function") this._ensureShadow();
    if (typeof connectedCb === "function") connectedCb.call(this);

    this.connect();
    // Run decorator-registered connect hooks (@interval, @watch, @on, @dynamicCss, …).
    // Hooks receive the controller instance (which carries the decorated
    // methods + `this.shadow`), matching how LoomElement passes `this`.
    const hooks = (this as unknown as Record<symbol, unknown>)[CONNECT_HOOKS.key] as
      | Array<(host: this) => (() => void) | void>
      | undefined;
    if (hooks) {
      for (let i = 0; i < hooks.length; i++) {
        const cleanup = hooks[i](this);
        if (typeof cleanup === "function") this.cleanups.push(cleanup);
      }
    }

    // Portal rendering: if update() is overridden, mount its output and wire
    // reactive re-renders (like LoomElement, but teleported to `this.target`).
    if (renders) {
      this.rerender();            // first render — creates lazily-read reactives
      this._subscribeReactives(); // then subscribe so none are missed
    }
  }

  /**
   * Discover this instance's @reactive/@prop/@store/@signal backing stores and
   * subscribe a batched re-render. Mirrors the discovery in @dynamicCss.
   */
  private _subscribeReactives(): void {
    const symbols = Object.getOwnPropertySymbols(this);
    for (let i = 0; i < symbols.length; i++) {
      const desc = symbols[i].description ?? "";
      if (
        desc.startsWith("loom:reactive:") ||
        desc.startsWith("loom:store:") ||
        desc.startsWith("loom:signal:")
      ) {
        const backing = (this as unknown as Record<symbol, unknown>)[symbols[i]] as
          | { subscribe?: (fn: () => void) => () => void }
          | undefined;
        if (backing && typeof backing.subscribe === "function") {
          this.cleanups.push(backing.subscribe(this._scheduleRender));
        }
      }
    }
  }

  /** @internal — attribute value changed. */
  __update(next: string): void {
    const old = this.value;
    if (old === next) return;
    this.value = next;
    this.valueChanged(old, next);
  }

  /** @internal — run disconnect() + all tracked cleanups. */
  __unmount(): void {
    for (let i = 0; i < this.cleanups.length; i++) this.cleanups[i]();
    this.cleanups.length = 0;
    this.disconnect();
  }
}

// ── Decorator ──

/**
 * Register a class as a custom attribute controller.
 *
 * ```ts
 * @attribute("data-tooltip")
 * class Tooltip extends LoomAttribute { ... }
 *
 * // portal target as an option:
 * @attribute("tooltip", { target: "#modal-root" })
 * class Tooltip extends LoomAttribute { ... }
 * ```
 */
export const attribute = createDecorator<[name: string, opts?: AttributeOptions]>((ctor, name, opts) => {
  registry.set(name, ctor as unknown as AttributeCtor);
  hasRegisteredAttributes = true;
  (ctor as unknown as Record<string, unknown>).__loom_attr = name;
  if (opts?.target != null) {
    (ctor as unknown as Record<string, unknown>).__loom_attr_target = opts.target;
  }
  // @prop / @reactive fields on a controller are plain reactive accessors used
  // to receive named args (see object-arg spread in `attach`). They are already
  // wired by the accessor itself; here we just consume the @component staging
  // queue so these keys don't leak into the next @component-decorated class.
  pendingProps.length = 0;
  // Re-scan any roots already being observed so a late-registered attribute
  // (e.g. from a lazily loaded module) picks up elements already in the DOM.
  // Roots register themselves in `observedRoots`; we can't enumerate a
  // WeakMap, so late registration only affects elements observed *after*
  // this point plus the next mutation on existing roots. Callers needing
  // immediate coverage can re-run `observeAttributes(root)`.
}, { class: true });

// ── Instance management ──

function attach(el: Element, name: string, value: string): void {
  const Ctor = registry.get(name);
  if (!Ctor) return;
  let map = instances.get(el);
  if (!map) { map = new Map(); instances.set(el, map); }
  if (map.has(name)) { // already mounted — treat as value update
    map.get(name)!.__update(value);
    return;
  }
  const inst = new Ctor();
  inst.el = el as HTMLElement;
  inst.name = name;
  inst.value = value;
  const arg = readArg(el, name, value);
  inst.arg = arg;
  // Structured args: `<div tooltip={{ text, placement }}>` → assign each key
  // onto the controller, feeding any @prop/@reactive accessors of the same
  // name. Functions, strings, arrays, null stay on `this.arg` untouched.
  if (arg !== null && typeof arg === "object" && !Array.isArray(arg)) {
    const obj = arg as Record<string, unknown>;
    for (const k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        (inst as unknown as Record<string, unknown>)[k] = obj[k];
      }
    }
  }
  map.set(name, inst);
  inst.__mount();
}

function update(el: Element, name: string, value: string): void {
  instances.get(el)?.get(name)?.__update(value);
}

function detach(el: Element, name: string): void {
  const map = instances.get(el);
  const inst = map?.get(name);
  if (!inst) return;
  inst.__unmount();
  map!.delete(name);
  if (map!.size === 0) instances.delete(el);
}

/** Dispose every controller on an element (used when the element is removed). */
function detachAll(el: Element): void {
  const map = instances.get(el);
  if (!map) return;
  for (const inst of map.values()) inst.__unmount();
  instances.delete(el);
}

// ── Scanning + observation ──

/** Attach/update controllers for every registered attribute on `el`. */
function scanElement(el: Element): void {
  const existing = instances.get(el);
  // Attach or update for currently-present registered attributes.
  for (const name of registry.keys()) {
    if (el.hasAttribute(name)) {
      attach(el, name, el.getAttribute(name) ?? "");
    } else if (existing?.has(name)) {
      detach(el, name); // attribute was removed
    }
  }
}

/** Recursively scan `root` and its element descendants. */
function scanTree(root: ParentNode): void {
  if ((root as Element).nodeType === 1) scanElement(root as Element);
  // querySelectorAll on a specific attribute set is cheaper than walking all
  // nodes, but attribute names can contain characters needing escaping and the
  // set is small; a single "*" walk with a hasAttribute check stays simple and
  // correct for a prototype.
  const all = root.querySelectorAll("*");
  for (let i = 0; i < all.length; i++) scanElement(all[i]);
}

/**
 * Observe a root (Document, ShadowRoot, or Element subtree) for registered
 * attributes. Performs an initial scan, then reacts to attribute and
 * child-list mutations. Returns an unobserve function.
 *
 * LoomElement wires this automatically for its shadow root. Call it yourself
 * for light-DOM / hand-written mount points, e.g.
 * `observeAttributes(document.body)`.
 */
export function observeAttributes(root: Document | ShadowRoot | Element): () => void {
  const existing = observedRoots.get(root);
  if (existing) {
    // Already observed — just re-scan for late-registered attributes.
    scanTree(root as unknown as ParentNode);
    return () => detachRoot(root);
  }

  scanTree(root as unknown as ParentNode);

  const observer = new MutationObserver((records) => {
    for (let i = 0; i < records.length; i++) {
      const rec = records[i];
      if (rec.type === "attributes") {
        const el = rec.target as Element;
        const name = rec.attributeName!;
        if (!registry.has(name)) continue;
        if (el.hasAttribute(name)) {
          if (instances.get(el)?.has(name)) update(el, name, el.getAttribute(name) ?? "");
          else attach(el, name, el.getAttribute(name) ?? "");
        } else {
          detach(el, name);
        }
      } else if (rec.type === "childList") {
        for (let j = 0; j < rec.addedNodes.length; j++) {
          const n = rec.addedNodes[j];
          if (n.nodeType === 1) scanTree(n as unknown as ParentNode);
        }
        for (let j = 0; j < rec.removedNodes.length; j++) {
          const n = rec.removedNodes[j];
          if (n.nodeType === 1) disposeTree(n as Element);
        }
      }
    }
  });

  // Observe all attribute changes (filter in callback) so attributes registered
  // after this call are still handled without re-creating the observer.
  observer.observe(root as Node, {
    attributes: true,
    childList: true,
    subtree: true,
  });
  observedRoots.set(root as Node, observer);

  return () => detachRoot(root);
}

function detachRoot(root: Node): void {
  const observer = observedRoots.get(root);
  if (observer) { observer.disconnect(); observedRoots.delete(root); }
  disposeTree(root as Element);
}

/** Dispose controllers on an element and all its descendants. */
function disposeTree(el: Element): void {
  if (el.nodeType !== 1) return;
  detachAll(el);
  const all = el.querySelectorAll?.("*");
  if (all) for (let i = 0; i < all.length; i++) detachAll(all[i]);
}
