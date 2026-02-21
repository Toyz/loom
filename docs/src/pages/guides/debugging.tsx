/**
 * Guides — Debugging
 * /guides/debugging
 *
 * inspect(), installGlobalHook(), createSymbol(), SYMBOL_REGISTRY
 */
import { LoomElement } from "@toyz/loom";

export default class PageDebugging extends LoomElement {
  update() {
    return (
      <div>
        <h1>Debugging</h1>
        <p class="subtitle">
          Zero-install component inspection. No browser extension needed — just import and go.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="search" size={20} color="var(--amber)"></loom-icon>
            <h2>inspect()</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">inspect(element)</div>
            <div class="dec-desc">
              Pretty-prints a component's metadata, reactive state, props, and stylesheet count
              to the console. Reads all registered symbols from the constructor automatically:
            </div>
            <code-block lang="ts" code={`import { inspect } from "@toyz/loom/debug";

// Select any Loom element
const el = document.querySelector("my-dashboard");
inspect(el);

// Console output:
// Loom <my-dashboard> shadow DOM
//   State   { count: 42, name: "hello" }
//   Props   { label: "Dashboard", theme: "dark" }
//   Metadata {
//     reactives: ["count", "name"],
//     props: [{ key: "label" }, { key: "theme" }],
//     watch: { count: ["onCountChange"] },
//     ...
//   }
//   Stylesheets 2
//   Constructor class MyDashboard { ... }`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="terminal" size={20} color="var(--cyan)"></loom-icon>
            <h2>DevTools Console Hook</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Install a global hook once, then inspect any element directly from
              the browser console. Add this to your app entry point:
            </div>
            <code-block lang="ts" code={`// main.ts
import { installGlobalHook } from "@toyz/loom/debug";

// Only in development
if (import.meta.env.DEV) {
  installGlobalHook();
}`}></code-block>
            <div class="dec-desc">
              Then in the DevTools console:
            </div>
            <code-block lang="js" code={`// Select an element in the Elements panel, then:
__loom.inspect($0)

// Or query by selector:
__loom.inspect(document.querySelector("my-widget"))

// Browse the full symbol registry:
__loom.SYMBOL_REGISTRY
// Map(17) {
//   "reactives" => Symbol(loom:reactives),
//   "props" => Symbol(loom:props),
//   "analytics:track" => Symbol(loom:analytics:track),
//   ...
// }`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--emerald)"></loom-icon>
            <h2>Reading Symbols Directly</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Every Loom decorator writes metadata to the class constructor using symbols.
              You can read them directly — no special tooling required:
            </div>
            <code-block lang="ts" code={`import { SYMBOL_REGISTRY } from "@toyz/loom";

// Get an element
const el = document.querySelector("page-settings");
const ctor = el.constructor;

// Read specific metadata
const reactives = ctor[SYMBOL_REGISTRY.get("reactives")];
// ["theme", "language", "notifications"]

const routeBindings = ctor[SYMBOL_REGISTRY.get("route:props")];
// [{ propKey: "tab", query: "tab" }]

const tracked = ctor[SYMBOL_REGISTRY.get("analytics:track")];
// [{ event: "settings.view", kind: "class" }]`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="plug" size={20} color="var(--rose)"></loom-icon>
            <h2>createSymbol() — Plugin API</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">createSymbol(name): symbol</div>
            <div class="dec-desc">
              Create a symbol that is automatically registered in the global{" "}
              <span class="ic">SYMBOL_REGISTRY</span>. Use this in your own
              decorators or plugins so <span class="ic">inspect()</span> picks
              up your metadata automatically:
            </div>
            <code-block lang="ts" code={`import { createSymbol } from "@toyz/loom";

// Register a custom symbol
const MY_CACHE = createSymbol("myPlugin:cache");

// Use it in your decorator
export function cache(ttl: number) {
  return (value: any, context: DecoratorContext) => {
    if (context.kind === "method") {
      const ctor = value.constructor ?? context;
      context.addInitializer(function(this: any) {
        const c = this.constructor;
        c[MY_CACHE] ??= [];
        c[MY_CACHE].push({ method: String(context.name), ttl });
      });
    }
  };
}

// Now inspect() automatically shows:
// Metadata { "myPlugin:cache": [{ method: "fetchData", ttl: 60000 }] }`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="package" size={20} color="var(--accent)"></loom-icon>
            <h2>Built-in Plugin Symbols</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              All first-party Loom packages register their decorator metadata via{" "}
              <span class="ic">createSymbol()</span>. This means{" "}
              <span class="ic">inspect()</span> shows everything:
            </div>
          </div>
          <table class="api-table">
            <thead>
              <tr><th>Package</th><th>Symbol</th><th>Shows</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>@toyz/loom</code></td>
                <td><code>reactives</code></td>
                <td>Reactive property names</td>
              </tr>
              <tr>
                <td><code>@toyz/loom</code></td>
                <td><code>props</code></td>
                <td>External prop bindings</td>
              </tr>
              <tr>
                <td><code>@toyz/loom</code></td>
                <td><code>route:props</code></td>
                <td>Route param/query bindings</td>
              </tr>
              <tr>
                <td><code>@toyz/loom</code></td>
                <td><code>watch</code></td>
                <td>Watcher registrations</td>
              </tr>
              <tr>
                <td><code>@toyz/loom</code></td>
                <td><code>emit</code></td>
                <td>Event emitter names</td>
              </tr>
              <tr>
                <td><code>@toyz/loom</code></td>
                <td><code>transforms</code></td>
                <td>Value transform mappings</td>
              </tr>
              <tr>
                <td><code>@toyz/loom-analytics</code></td>
                <td><code>analytics:track</code></td>
                <td>Tracked events and targets</td>
              </tr>
              <tr>
                <td><code>@toyz/loom-flags</code></td>
                <td><code>flags:gated</code></td>
                <td>Feature flag gates</td>
              </tr>
              <tr>
                <td><code>@toyz/loom-rpc</code></td>
                <td><code>rpc:queries</code></td>
                <td>RPC query bindings</td>
              </tr>
              <tr>
                <td><code>@toyz/loom-rpc</code></td>
                <td><code>rpc:mutations</code></td>
                <td>RPC mutation bindings</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="callout">
            <strong>Tip:</strong> Add <span class="ic">installGlobalHook()</span> behind
            an <span class="ic">import.meta.env.DEV</span> guard so it tree-shakes out of
            production builds.
          </div>
        </section>
      </div>
    );
  }
}
