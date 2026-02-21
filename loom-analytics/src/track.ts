/**
 * LoomAnalytics — @track decorator
 *
 * Raw TC39 Stage 3 decorator for event tracking.
 * Dispatches on `context.kind` to support class, method, and accessor targets.
 *
 * - **class**: wraps connectedCallback — fires track() on mount
 * - **method**: wraps the method — fires track() after each invocation
 * - **accessor**: wraps the setter — fires track() on every set
 *
 * ```ts
 * // Static metadata
 * @track("user.save", { section: "profile" })
 * handleSave() { ... }
 *
 * // Dynamic metadata — fn receives the element instance
 * @track("page.view", el => ({ userId: el.userId, route: el.currentRoute }))
 * class Dashboard extends LoomElement { ... }
 *
 * @track("theme.change")
 * accessor theme = "dark";
 * ```
 */

import { app, createSymbol } from "@toyz/loom";
import { AnalyticsTransport } from "./transport";

/** Symbol for inspect() introspection */
export const TRACK_META = createSymbol("analytics:track");

/** Second arg: static object OR a function that receives the element and returns metadata */
type MetaArg = Record<string, any> | ((el: any) => Record<string, any>);

/** Resolve meta: if it's a function, call it with the element; otherwise spread it */
function resolveMeta(meta: MetaArg | undefined, el: any): Record<string, any> {
  if (!meta) return {};
  if (typeof meta === "function") return meta(el);
  return { ...meta };
}

export function track(event: string, meta?: MetaArg) {
  return (value: any, context: DecoratorContext): any => {
    switch (context.kind) {
      case "class": {
        const ctor = value as any;
        ctor[TRACK_META.key] ??= [];
        ctor[TRACK_META.key].push({ event, kind: "class" });
        const originalConnected = ctor.prototype.connectedCallback;
        ctor.prototype.connectedCallback = function (this: any) {
          if (originalConnected) originalConnected.call(this);
          app.get(AnalyticsTransport).track(event, {
            ...resolveMeta(meta, this),
            element: this.tagName.toLowerCase(),
          });
        };
        break;
      }

      case "method": {
        const method = value as Function;
        const key = String(context.name);
        context.addInitializer(function (this: any) {
          const ctor = this.constructor;
          ctor[TRACK_META.key] ??= [];
          ctor[TRACK_META.key].push({ event, kind: "method", method: key });
          const original = method;
          const self = this;
          (this as any)[key] = function (...args: any[]) {
            const result = original.apply(self, args);
            app.get(AnalyticsTransport).track(event, {
              ...resolveMeta(meta, self),
              method: key,
              args,
            });
            return result;
          };
        });
        break;
      }

      case "accessor": {
        const target = value as ClassAccessorDecoratorTarget<any, any>;
        const key = String(context.name);
        context.addInitializer(function (this: any) {
          const ctor = this.constructor;
          ctor[TRACK_META.key] ??= [];
          ctor[TRACK_META.key].push({ event, kind: "accessor", property: key });
        });
        return {
          get(this: any) {
            return target.get.call(this);
          },
          set(this: any, v: any) {
            target.set.call(this, v);
            app.get(AnalyticsTransport).track(event, {
              ...resolveMeta(meta, this),
              property: key,
              value: v,
            });
          },
        };
      }
    }
  };
}
