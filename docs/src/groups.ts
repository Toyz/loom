/**
 * Docs — Route Groups
 *
 * Dogfooding Loom's @group decorator to organize the docs site routes.
 * Each section of the docs gets its own group with a shared prefix.
 *
 * 💡 Open DevTools → Console to see the "docs-log" guard fire on every
 *    navigation. This is a live demo of @guard + @group working together.
 */
import { group, guard } from "@toyz/loom/router";
import { service } from "@toyz/loom";

// ── Demo guard ──
// A silly guard that always allows navigation but logs it to the console.
// Open DevTools to see it in action!

@service()
export class DocsGuards {
  @guard("docs-log")
  log() {
    console.log(
      "%c🧭 Loom Guard %c docs-log %c— route allowed ✓",
      "color:#a78bfa;font-weight:bold",
      "color:#34d399;font-weight:bold",
      "color:#94a3b8",
    );
    return true;
  }
}

@group("/element", { guards: ["docs-log"] })
export class ElementGroup {}

@group("/router", { guards: ["docs-log"] })
export class RouterGroup {}

@group("/store", { guards: ["docs-log"] })
export class StoreGroup {}

@group("/decorators", { guards: ["docs-log"] })
export class DecoratorsGroup {}

@group("/di", { guards: ["docs-log"] })
export class DIGroup {}

@group("/packages", { guards: ["docs-log"] })
export class PackagesGroup {}

@group("/examples", { guards: ["docs-log"] })
export class ExamplesGroup {}
