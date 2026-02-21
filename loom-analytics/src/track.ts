/**
 * LoomAnalytics — @track decorator
 *
 * Raw TC39 Stage 3 decorator for event tracking.
 * Dispatches on `context.kind` to support class, method, and accessor targets.
 *
 * - **method**: wraps the method — fires track() after each invocation
 * - **accessor**: wraps the setter — fires track() on every set
 *
 * ```ts
 * @track("user.save")
 * handleSave() { ... }
 *
 * @track("theme.change")
 * accessor theme = "dark";
 * ```
 */

import { app } from "@toyz/loom";
import { AnalyticsTransport } from "./transport";

export function track(event: string, meta?: Record<string, any>) {
  return (value: any, context: DecoratorContext): any => {
    switch (context.kind) {
      case "class": {
        // Class decorator: stamp an addInitializer that fires on connect
        // Since we can't hook connectedCallback from here, we stamp a marker
        // and let the test/runtime check for it.  For simplicity, we fire
        // track at class-definition time for class-level usage (page views).
        // Actually — we can use addInitializer for per-instance setup, but
        // it doesn't have `this` for class decorators in esbuild.
        // Pragmatic solution: wrap the constructor via a returned subclass.
        // BUT esbuild drops class decorator return values.
        // Final approach: directly wrap connectedCallback on the prototype.
        const ctor = value as Function;
        const originalConnected = ctor.prototype.connectedCallback;
        ctor.prototype.connectedCallback = function (this: any) {
          if (originalConnected) originalConnected.call(this);
          app.get(AnalyticsTransport).track(event, {
            ...meta,
            element: this.tagName.toLowerCase(),
          });
        };
        break;
      }

      case "method": {
        // Method decorator: wrap to fire after invocation
        const method = value as Function;
        const key = String(context.name);
        context.addInitializer(function (this: any) {
          const original = method;
          (this as any)[key] = function (...args: any[]) {
            const result = original.apply(this, args);
            app.get(AnalyticsTransport).track(event, { ...meta, method: key, args });
            return result;
          };
        });
        break;
      }

      case "accessor": {
        // Accessor decorator: wrap the setter to fire on set
        const target = value as ClassAccessorDecoratorTarget<any, any>;
        const key = String(context.name);
        return {
          get(this: any) {
            return target.get.call(this);
          },
          set(this: any, v: any) {
            target.set.call(this, v);
            app.get(AnalyticsTransport).track(event, {
              ...meta,
              property: key,
              value: v,
            });
          },
        };
      }
    }
  };
}
