/**
 * LoomFlags — @flag decorator
 *
 * Raw TC39 Stage 3 decorator for feature flag gating.
 * Dispatches on `context.kind` to support class and method targets.
 *
 * - **class**: injects a reactive `flagEnabled` boolean property
 * - **method**: guards execution — no-op when flag is off
 *
 * ```ts
 * // Class — injects flagEnabled property
 * @flag("new-dashboard")
 * class Dashboard extends LoomElement { ... }
 *
 * // Method — no-op when flag is off
 * @flag("beta-export")
 * handleExport() { ... }
 *
 * // Dynamic context from element instance
 * @flag("premium", el => ({ plan: el.plan }))
 * class PremiumWidget extends LoomElement { ... }
 * ```
 */

import { app, bus, createSymbol } from "@toyz/loom";
import { FlagProvider } from "./provider";
import { FlagChanged } from "./events";

/** Symbol for inspect() introspection */
export const FLAG_META = createSymbol("flags:gated");

/** Second arg: static context or a function returning context from element */
type ContextArg = Record<string, any> | ((el: any) => Record<string, any>);

function resolveContext(ctx: ContextArg | undefined, el: any): Record<string, any> | undefined {
  if (!ctx) return undefined;
  if (typeof ctx === "function") return ctx(el);
  return { ...ctx };
}

export function flag(name: string, context?: ContextArg) {
  return (value: any, decoratorContext: DecoratorContext): any => {
    switch (decoratorContext.kind) {
      case "class": {
        const ctor = value as any;
        ctor[FLAG_META] ??= [];
        ctor[FLAG_META].push({ flag: name, kind: "class" });
        const originalConnected = ctor.prototype.connectedCallback;

        ctor.prototype.connectedCallback = function (this: any) {
          if (originalConnected) originalConnected.call(this);

          // Set initial flag state
          const ctx = resolveContext(context, this);
          this.flagEnabled = app.get(FlagProvider).isEnabled(name, ctx);
          this.flagName = name;

          // Listen for flag changes — re-evaluate reactively
          const handler = (event: FlagChanged) => {
            if (event.flag === name) {
              this.flagEnabled = event.enabled;
              this.scheduleUpdate?.();
            }
          };
          bus.on(FlagChanged, handler);

          // Cleanup on disconnect
          if (this.track) {
            this.track(() => bus.off(FlagChanged, handler));
          }
        };
        break;
      }

      case "method": {
        const method = value as Function;
        const key = String(decoratorContext.name);

        decoratorContext.addInitializer(function (this: any) {
          const ctor = this.constructor;
          ctor[FLAG_META] ??= [];
          ctor[FLAG_META].push({ flag: name, kind: "method", method: key });
          const original = method;
          const self = this;
          (this as any)[key] = function (...args: any[]) {
            const ctx = resolveContext(context, self);
            if (!app.get(FlagProvider).isEnabled(name, ctx)) {
              return; // Flag is off — no-op
            }
            return original.apply(self, args);
          };
        });
        break;
      }
    }
  };
}
