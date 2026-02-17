/**
 * Loom — @lazy decorator (TC39 Stage 3)
 *
 * Stackable class decorator that defers module loading until first mount.
 *
 * ```ts
 * @component("settings-page")
 * @route("/settings")
 * @lazy(() => import("./pages/settings"))
 * class SettingsPage extends LoomElement {}
 * ```
 */

const LAZY_LOADER = Symbol("loom:lazy:loader");
const LAZY_OPTS = Symbol("loom:lazy:opts");
const LAZY_LOADED = Symbol("loom:lazy:loaded");

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
    ctor[LAZY_LOADER] = loader;
    ctor[LAZY_OPTS] = opts;

    const origConnected = ctor.prototype.connectedCallback;

    ctor.prototype.connectedCallback = async function () {
      if (ctor[LAZY_LOADED]) {
        origConnected?.call(this);
        return;
      }

      if (opts?.loading) {
        const loadingEl = document.createElement(opts.loading);
        this.shadow.appendChild(loadingEl);
      }

      try {
        const mod = await loader();
        const RealClass = (mod as { default?: Function }).default ?? mod;

        const realProto = (RealClass as Function).prototype;
        const descriptors = Object.getOwnPropertyDescriptors(realProto);

        for (const [key, desc] of Object.entries(descriptors)) {
          if (key === "constructor") continue;
          Object.defineProperty(ctor.prototype, key, desc);
        }

        const staticDescs = Object.getOwnPropertyDescriptors(RealClass as object);
        for (const [key, desc] of Object.entries(staticDescs)) {
          if (["prototype", "length", "name"].includes(key)) continue;
          Object.defineProperty(ctor, key, desc);
        }

        ctor[LAZY_LOADED] = true;
        this.shadow.innerHTML = "";

        if (ctor.prototype.connectedCallback !== origConnected) {
          ctor.prototype.connectedCallback.call(this);
        } else {
          origConnected?.call(this);
        }
      } catch (err) {
        console.error("[Loom @lazy] Failed to load module:", err);
        this.shadow.innerHTML = `<p style="color:red">Failed to load component</p>`;
      }
    };
  };
}

export { LAZY_LOADER, LAZY_OPTS, LAZY_LOADED };
