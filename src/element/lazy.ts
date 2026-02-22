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
  /** Tag name of a loading component to show while the chunk loads */
  loading?: string;
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

    ctor.prototype.connectedCallback = async function () {
      // Already loaded — if we have a hosted impl, just call its connected
      if (ctor[LAZY_LOADED.key]) {
        origConnected?.call(this);
        // Re-mount the impl if disconnected/reconnected
        if (!this[LAZY_IMPL.key] || !this[LAZY_IMPL.key].isConnected) {
          this._mountLazyImpl?.();
        }
        return;
      }

      // Show loading indicator
      if (opts?.loading) {
        const loadingEl = document.createElement(opts.loading);
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

        // Store the impl tag for future mounts
        ctor[LAZY_LOADED.key] = true;
        ctor.__lazy_impl_tag = implTag;

        // Clear loading indicator and mount
        this.shadow.innerHTML = "";
        this._mountLazyImpl = () => {
          const realEl = document.createElement(ctor.__lazy_impl_tag);

          // Forward all attributes from shell → real instance
          for (const attr of this.attributes) {
            realEl.setAttribute(attr.name, attr.value);
          }

          // Forward route data via ROUTE_PROPS metadata
          const routeBindings: any[] = ctor[ROUTE_PROPS.key] ?? [];
          for (const binding of routeBindings) {
            const val = (this as any)[binding.propKey];
            if (val !== undefined) {
              (realEl as any)[binding.propKey] = val;
            }
          }

          this.shadow.appendChild(realEl);
          this[LAZY_IMPL.key] = realEl;
        };

        this._mountLazyImpl();
      } catch (err) {
        console.error("[Loom @lazy] Failed to load module:", err);
        this.shadow.innerHTML = `<p style="color:red">Failed to load component</p>`;
      }
    };
  };
}

export { LAZY_LOADER, LAZY_OPTS, LAZY_LOADED, LAZY_IMPL };

