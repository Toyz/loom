/**
 * Loom — @lazy decorator (TC39 Stage 3)
 *
 * Stackable class decorator that defers module loading until first mount.
 *
 * The shell element hosts a real instance inside its shadow DOM.
 * This is necessary because TC39 private fields (#private) are
 * per-class-identity — prototype-copying can't transfer private slots.
 *
 * ```ts
 * @component("settings-page")
 * @route("/settings")
 * @lazy(() => import("./pages/settings"))
 * class SettingsPage extends LoomElement {}
 * ```
 */

import { ROUTE_PROPS, createSymbol } from "../decorators/symbols";

const LAZY_LOADER = createSymbol("lazy:loader");
const LAZY_OPTS   = createSymbol<LazyOptions>("lazy:opts");
const LAZY_LOADED = createSymbol<boolean>("lazy:loaded");
const LAZY_IMPL   = createSymbol("lazy:impl");

export interface LazyOptions {
  /** Loading indicator — tag name string or factory returning a DOM node (JSX works) */
  loading?: string | (() => Node);
}

/**
 * @lazy(loader, opts?) — Stackable class decorator
 *
 * Defers the real class body until first connectedCallback.
 * The loader should return a dynamic import whose default export
 * is the real component class.
 */
export function lazy(
  loader: () => Promise<{ default: unknown } | unknown>,
  opts?: LazyOptions,
) {
  return function (value: Function, _context: ClassDecoratorContext) {
    const ctor = value as any;
    ctor[LAZY_LOADER.key] = loader;
    ctor[LAZY_OPTS.key] = opts;

    const origConnected = ctor.prototype.connectedCallback;
    const origAdoptStyles = ctor.prototype.adoptStyles;

    // Override adoptStyles to forward through to impl
    ctor.prototype.adoptStyles = function (sheets: CSSStyleSheet[]) {
      // Stash for when impl mounts later
      this.__lazyStyles = sheets;
      // Also apply to shell's own shadow (keeps the call valid)
      origAdoptStyles?.call(this, sheets);
      // Forward to impl if already mounted
      const impl = this[LAZY_IMPL.key];
      if (impl && typeof impl.adoptStyles === "function") {
        impl.adoptStyles(sheets);
      }
    };

    ctor.prototype.connectedCallback = async function () {
      // Already loaded — mount the impl for this (possibly new) instance
      if (ctor[LAZY_LOADED.key]) {
        origConnected?.call(this);
        // Mount impl if this instance doesn't have one yet
        if (!this[LAZY_IMPL.key] || !this[LAZY_IMPL.key].isConnected) {
          ctor.__mountLazyImpl.call(this);
        }
        return;
      }

      // Show loading indicator
      if (opts?.loading) {
        const loadingEl = typeof opts.loading === "function"
          ? opts.loading()
          : document.createElement(opts.loading);
        this.shadow.appendChild(loadingEl);
      }

      try {
        const mod = await loader();
        const RealClass = (mod as { default?: Function }).default ?? mod;

        // Register the real class under an internal impl tag
        const baseTag = ctor.__loom_tag ?? this.tagName.toLowerCase();
        const implTag = `${baseTag}-impl`;

        if (!customElements.get(implTag)) {
          customElements.define(implTag, RealClass as CustomElementConstructor);
        }

        // Store the impl tag and shared mount function on the constructor
        ctor[LAZY_LOADED.key] = true;
        ctor.__lazy_impl_tag = implTag;

        // Shared mount function — can be called by any instance
        ctor.__mountLazyImpl = function (this: any) {
          this.shadow.innerHTML = "";
          const realEl = document.createElement(ctor.__lazy_impl_tag);

          // Forward all attributes from shell → real instance
          for (const attr of this.attributes) {
            realEl.setAttribute(attr.name, attr.value);
            // Also set as property for @prop accessor bindings
            // (setAttribute alone doesn't trigger reactive setters)
            if (attr.name in realEl) {
              (realEl as any)[attr.name] = attr.value;
            }
          }

          // Forward route data via ROUTE_PROPS metadata
          const routeBindings: any[] = ctor[ROUTE_PROPS.key] ?? [];
          for (const binding of routeBindings) {
            const val = (this as any)[binding.propKey];
            if (val !== undefined) {
              (realEl as any)[binding.propKey] = val;
            }
          }

          // Forward stashed styles from adoptStyles() calls before impl mounted
          if (this.__lazyStyles && typeof (realEl as any).adoptStyles === "function") {
            (realEl as any).adoptStyles(this.__lazyStyles);
          }

          this.shadow.appendChild(realEl);
          this[LAZY_IMPL.key] = realEl;
        };

        ctor.__mountLazyImpl.call(this);
      } catch (err) {
        console.error("[Loom @lazy] Failed to load module:", err);
        this.shadow.innerHTML = `<p style="color:red">Failed to load component</p>`;
      }
    };
  };
}

export { LAZY_LOADER, LAZY_OPTS, LAZY_LOADED, LAZY_IMPL };

