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

import { PROPS, ROUTE_PROPS, TRANSFORMS, ROUTE_ENTER, ROUTE_LEAVE, createSymbol } from "../decorators/symbols";
import { bus } from "../bus";
import { LazyLoadStart, LazyLoadEnd } from "./lazy-events";

const LAZY_LOADER = createSymbol("lazy:loader");
const LAZY_OPTS = createSymbol<LazyOptions>("lazy:opts");
const LAZY_LOADED = createSymbol<boolean>("lazy:loaded");
const LAZY_IMPL = createSymbol("lazy:impl");

export interface LazyOptions {
  /** Loading indicator — tag name string or factory returning a DOM node (JSX works) */
  loading?: string | (() => Node);
  /** Error fallback — tag name string or factory returning a DOM node (JSX works) */
  error?: string | (() => Node);
  /** When to trigger the load. 'mount' (default) = on connectedCallback. 'viewport' = on IntersectionObserver. */
  trigger?: 'mount' | 'viewport';
  /** IntersectionObserver rootMargin for viewport trigger. Default: '200px' (start loading 200px before visible). */
  rootMargin?: string;
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

    /**
     * Static .prefetch() — warm the import cache before mount.
     * Returns the cached module promise. Idempotent.
     */
    ctor.prefetch = (): Promise<unknown> => {
      if (!ctor.__prefetchPromise) {
        ctor.__prefetchPromise = loader();
      }
      return ctor.__prefetchPromise;
    };

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

    // Override scheduleUpdate so the outlet's same-component re-navigation
    // propagates updated route params from the shell → impl element.
    const origScheduleUpdate = ctor.prototype.scheduleUpdate;
    ctor.prototype.scheduleUpdate = function () {
      const impl = this[LAZY_IMPL.key];
      if (impl) {
        // Re-forward route props from shell → impl
        const realCtor = impl.constructor as any;
        const realBindings: any[] = realCtor[ROUTE_PROPS.key] ?? [];
        const stubBindings: any[] = ctor[ROUTE_PROPS.key] ?? [];
        const transforms = realCtor[TRANSFORMS.key] as Map<string, Function> | undefined;

        for (const binding of realBindings) {
          let val = (this as any)[binding.propKey];
          if (val === undefined && typeof binding.param === "string") {
            const stubBinding = stubBindings.find((b: any) => b.param === binding.param);
            if (stubBinding) val = (this as any)[stubBinding.propKey];
            if (val === undefined) val = this.getAttribute(binding.param) ?? undefined;
          } else if (val === undefined && binding.query !== undefined) {
            // Query bindings: find the stub's propKey for the same query key/sentinel
            const stubBinding = stubBindings.find((b: any) => b.query === binding.query);
            if (stubBinding) val = (this as any)[stubBinding.propKey];
            // Fallback: read from URL — same logic as outlet._parseQuery()
            // Needed when stub has no @prop({ query }) binding so the outlet
            // never wrote the value to the shell property.
            if (val === undefined) {
              const hash = location.hash;
              const hashQ = hash.indexOf("?");
              const qp = hashQ >= 0
                ? new URLSearchParams(hash.slice(hashQ + 1))
                : new URLSearchParams(location.search);
              if (typeof binding.query === "string") {
                const v = qp.get(binding.query);
                if (v !== null) val = v;
              } else if (typeof binding.query === "symbol") {
                // routeQuery sentinel — decompose full query as object
                val = Object.fromEntries(qp);
              }
            }
          }
          if (val !== undefined) {
            if (transforms?.has(binding.propKey)) {
              val = transforms.get(binding.propKey)!(val);
            } else if (typeof val === "string") {
              const current = (impl as any)[binding.propKey];
              if (typeof current === "number") val = Number(val);
              else if (typeof current === "boolean") val = val !== "false";
            }
            (impl as any)[binding.propKey] = val;
          }
        }

        // Also forward unbound attributes
        for (const attr of this.attributes) {
          if (attr.name in impl && !realBindings.some((b: any) => b.propKey === attr.name)) {
            try { (impl as any)[attr.name] = attr.value; }
            catch { /* getter-only property — skip */ }
          }
        }

        // Schedule the impl's update instead of the shell's
        if (typeof impl.scheduleUpdate === "function") {
          impl.scheduleUpdate();
        }
        return;
      }
      // No impl yet — fall through to normal shell update
      origScheduleUpdate?.call(this);
    };

    // disconnectedCallback — clean up viewport observer
    const origDisconnected = ctor.prototype.disconnectedCallback;
    ctor.prototype.disconnectedCallback = function () {
      if (this.__lazyObserver) {
        this.__lazyObserver.disconnect();
        this.__lazyObserver = null;
      }
      origDisconnected?.call(this);
    };

    ctor.prototype.connectedCallback = async function () {
      // Set up .ready promise — resolves when impl is fully mounted
      let readyResolve: (el: any) => void;
      let readyReject: (err: unknown) => void;
      this.ready = new Promise<any>((res, rej) => {
        readyResolve = res;
        readyReject = rej;
      });
      // Suppress unhandled rejection if nobody awaits .ready on error
      this.ready.catch(() => { });

      // Already loaded — mount the impl for this (possibly new) instance
      if (ctor[LAZY_LOADED.key]) {
        origConnected?.call(this);
        // Mount impl if this instance doesn't have one yet
        if (!this[LAZY_IMPL.key] || !this[LAZY_IMPL.key].isConnected) {
          ctor.__mountLazyImpl.call(this);
        }
        readyResolve!(this);
        return;
      }

      // ── Viewport trigger: defer loading until element is near-visible ──
      if (opts?.trigger === 'viewport' && !this.__lazyViewportTriggered) {
        const doViewportLoad = () => {
          // Clean up observer — done with it
          if (this.__lazyObserver) {
            this.__lazyObserver.disconnect();
            this.__lazyObserver = null;
          }
          // Mark this instance as ready to load — don't mutate shared opts
          this.__lazyViewportTriggered = true;
          this.connectedCallback();
        };

        // If chunk was prefetched, skip the observer — load immediately
        if (ctor.__prefetchPromise) {
          doViewportLoad();
          return;
        }

        const observer = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) {
            doViewportLoad();
          }
        }, { rootMargin: opts.rootMargin ?? '200px' });
        observer.observe(this);
        this.__lazyObserver = observer;

        // Show loading placeholder (if any) while waiting for viewport
        if (opts?.loading) {
          const loadingEl = typeof opts.loading === 'function'
            ? opts.loading()
            : document.createElement(opts.loading);
          this.shadow.appendChild(loadingEl);
        }
        return;
      }

      // Install a Proxy on the instance prototype to auto-queue method
      // calls made before the impl loads. Unknown method calls are buffered
      // and replayed after mount. Each queued call returns a Promise that
      // resolves to the real return value.
      const origProto = Object.getPrototypeOf(this);
      const lazyQueue: Array<{ method: string; args: unknown[]; resolve: (v: any) => void }> = [];
      const queueProxy = new Proxy(origProto, {
        get: (target: any, prop: string | symbol, receiver: any) => {
          // Symbols and known properties — pass through normally
          if (typeof prop === "symbol" || prop in target) {
            return Reflect.get(target, prop, receiver);
          }
          // Skip Promise protocol, conversion methods, and internals
          if (
            prop === "then" || prop === "catch" || prop === "finally" ||
            prop === "toJSON" || prop === "valueOf" || prop === "toString" ||
            prop === "toLocaleString" || prop === "constructor" ||
            prop === "nodeType" || prop === "nodeName" ||
            prop.startsWith("_")
          ) {
            return undefined;
          }
          // Unknown string property — return a queuing function
          return (...args: unknown[]) => {
            return new Promise<any>(resolve => {
              lazyQueue.push({ method: prop, args, resolve });
            });
          };
        },
      });
      Object.setPrototypeOf(this, queueProxy);

      // Helper: restore prototype and replay queued calls
      const replayQueue = () => {
        Object.setPrototypeOf(this, origProto);
        const impl = this[LAZY_IMPL.key];
        if (impl) {
          for (const { method, args, resolve } of lazyQueue) {
            const fn = (impl as any)[method];
            resolve(typeof fn === "function" ? fn.call(impl, ...args) : fn);
          }
        }
        lazyQueue.length = 0;
      };

      // Show loading indicator
      if (opts?.loading) {
        const loadingEl = typeof opts.loading === "function"
          ? opts.loading()
          : document.createElement(opts.loading);
        this.shadow.appendChild(loadingEl);
      }

      const tag = ctor.__loom_tag ?? this.tagName.toLowerCase();
      const t0 = performance.now();
      bus.emit(new LazyLoadStart(tag));

      try {
        // Use prefetched module if available, otherwise load now
        const mod = await (ctor.__prefetchPromise ?? loader());
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
          const realCtor = realEl.constructor as any;

          // Forward all attributes from shell → real instance
          for (const attr of this.attributes) {
            realEl.setAttribute(attr.name, attr.value);
            // Also set as property for @prop accessor bindings
            // (setAttribute alone doesn't trigger reactive setters)
            if (attr.name in realEl) {
              (realEl as any)[attr.name] = attr.value;
            }
          }

          // Forward @prop values set programmatically on the shell.
          // The attribute loop above only catches HTML attributes;
          // this handles JS property writes (e.g. shellEl.count = 5).
          const propsMap: Map<string, string> | undefined = realCtor[PROPS.key];
          if (propsMap) {
            const transforms: Map<string, Function> | undefined = realCtor[TRANSFORMS.key];
            for (const [_attr, field] of propsMap) {
              // Skip if already forwarded via attribute loop
              if (this.hasAttribute(field) || this.hasAttribute(_attr)) continue;
              const val = (this as any)[field];
              if (val !== undefined && val !== null) {
                if (transforms?.has(field)) {
                  (realEl as any)[field] = transforms.get(field)!(val);
                } else {
                  (realEl as any)[field] = val;
                }
              }
            }
          }

          // Forward route data via ROUTE_PROPS metadata.
          // Use the REAL component's bindings so propKey (accessor name)
          // is used instead of the attribute/param name.
          const realBindings: any[] = realCtor[ROUTE_PROPS.key] ?? [];
          const stubBindings: any[] = ctor[ROUTE_PROPS.key] ?? [];
          const transforms = realCtor[TRANSFORMS.key] as Map<string, Function> | undefined;

          for (const binding of realBindings) {
            // Try to read from stub by propKey first (works when stub has same accessor)
            let val = (this as any)[binding.propKey];

            // Fallback: if stub used a different accessor name, look up by param/query key
            if (val === undefined && typeof binding.param === "string") {
              // Check stub bindings for same param
              const stubBinding = stubBindings.find((b: any) => b.param === binding.param);
              if (stubBinding) val = (this as any)[stubBinding.propKey];
              // Last resort: read from attribute
              if (val === undefined) val = this.getAttribute(binding.param) ?? undefined;
            } else if (val === undefined && binding.query !== undefined) {
              // Query bindings: find the stub's propKey for the same query key/sentinel
              const stubBinding = stubBindings.find((b: any) => b.query === binding.query);
              if (stubBinding) val = (this as any)[stubBinding.propKey];
              // Fallback: read from URL — same logic as outlet._parseQuery()
              // Needed when stub has no @prop({ query }) binding so the outlet
              // never wrote the value to the shell property.
              if (val === undefined) {
                const hash = location.hash;
                const hashQ = hash.indexOf("?");
                const qp = hashQ >= 0
                  ? new URLSearchParams(hash.slice(hashQ + 1))
                  : new URLSearchParams(location.search);
                if (typeof binding.query === "string") {
                  const v = qp.get(binding.query);
                  if (v !== null) val = v;
                } else if (typeof binding.query === "symbol") {
                  // routeQuery sentinel — decompose full query as object
                  val = Object.fromEntries(qp);
                }
              }
            }

            if (val !== undefined) {
              // Apply @transform if registered on the real component
              if (transforms?.has(binding.propKey)) {
                val = transforms.get(binding.propKey)!(val);
              } else if (typeof val === "string") {
                // Auto-coerce string → number/boolean
                const current = (realEl as any)[binding.propKey];
                if (typeof current === "number") val = Number(val);
                else if (typeof current === "boolean") val = val !== "false";
              }
              (realEl as any)[binding.propKey] = val;
            }
          }

          // Forward stashed styles from adoptStyles() calls before impl mounted
          if (this.__lazyStyles && typeof (realEl as any).adoptStyles === "function") {
            (realEl as any).adoptStyles(this.__lazyStyles);
          }

          this.shadow.appendChild(realEl);
          this[LAZY_IMPL.key] = realEl;

          // Forward @onRouteEnter / @onRouteLeave from shell → impl.
          // The router looks up these handlers by querying the outlet's shadow
          // for the tag (which returns the shell), then reads ROUTE_ENTER metadata.
          // We copy the metadata and create forwarding stubs on the shell instance
          // so the router's handler invocation delegates to the impl.
          const implProto = Object.getPrototypeOf(realEl) as object;
          const enterHandlers: string[] = (ROUTE_ENTER.from(implProto) as string[] | undefined) ?? [];
          const leaveHandlers: string[] = (ROUTE_LEAVE.from(implProto) as string[] | undefined) ?? [];

          if (enterHandlers.length > 0) {
            ROUTE_ENTER.set(this, enterHandlers);
            ROUTE_ENTER.set(Object.getPrototypeOf(this) as object, enterHandlers);
            for (const key of enterHandlers) {
              (this as any)[key] = (...args: unknown[]) => (realEl as any)[key]?.(...args);
            }
          }
          if (leaveHandlers.length > 0) {
            ROUTE_LEAVE.set(this, leaveHandlers);
            ROUTE_LEAVE.set(Object.getPrototypeOf(this) as object, leaveHandlers);
            for (const key of leaveHandlers) {
              (this as any)[key] = (...args: unknown[]) => (realEl as any)[key]?.(...args);
            }
          }

          // Forward custom methods from impl → shell.
          // Walk the impl's prototype chain up to (but not including)
          // HTMLElement, and create forwarding stubs on this shell instance
          // for any method not already present.
          const shellProto = Object.getPrototypeOf(this);
          let proto = implProto;
          while (proto && proto !== HTMLElement.prototype) {
            for (const key of Object.getOwnPropertyNames(proto)) {
              // Skip constructor, built-in lifecycle, and anything already on the shell
              if (
                key === "constructor" ||
                key === "connectedCallback" ||
                key === "disconnectedCallback" ||
                key === "attributeChangedCallback" ||
                key === "adoptedCallback" ||
                key === "update" ||
                key === "scheduleUpdate" ||
                key === "adoptStyles" ||
                key.startsWith("_")
              ) continue;

              const desc = Object.getOwnPropertyDescriptor(proto, key);
              if (desc && typeof desc.value === "function" && !(key in shellProto)) {
                (this as any)[key] = (...args: unknown[]) => (realEl as any)[key]?.(...args);
              }
            }
            proto = Object.getPrototypeOf(proto);
          }
        };

        // Restore original prototype BEFORE mount so that property reads
        // inside __mountLazyImpl (e.g., prop forwarding checking this.heading)
        // don't get intercepted by the queue proxy.
        Object.setPrototypeOf(this, origProto);

        ctor.__mountLazyImpl.call(this);

        // Replay any method calls that were queued while loading
        const impl = this[LAZY_IMPL.key];
        if (impl && lazyQueue.length > 0) {
          for (const { method, args, resolve } of lazyQueue) {
            const fn = (impl as any)[method];
            resolve(typeof fn === "function" ? fn.call(impl, ...args) : fn);
          }
          lazyQueue.length = 0;
        }

        bus.emit(new LazyLoadEnd(tag, true, performance.now() - t0));
        readyResolve!(this);
      } catch (err) {
        // Clean up proxy without replaying
        Object.setPrototypeOf(this, origProto);
        lazyQueue.length = 0;

        console.error("[Loom @lazy] Failed to load module:", err);
        bus.emit(new LazyLoadEnd(tag, false, performance.now() - t0, err));
        this.shadow.innerHTML = "";
        if (opts?.error) {
          const errorEl = typeof opts.error === "function"
            ? opts.error()
            : document.createElement(opts.error);
          this.shadow.appendChild(errorEl);
        } else {
          this.shadow.innerHTML = `<p style="color:red">Failed to load component</p>`;
        }
        readyReject!(err);
      }
    };
  };
}

export { LAZY_LOADER, LAZY_OPTS, LAZY_LOADED, LAZY_IMPL };

