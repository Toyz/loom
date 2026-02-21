/**
 * Symbols — /decorators/symbols
 *
 * LoomSymbol<T> typed symbol system for framework metadata.
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorsSymbols extends LoomElement {

  update() {
    return (
      <div>
        <h1>Typed Symbols</h1>
        <p class="subtitle">
          <span class="ic">LoomSymbol&lt;T&gt;</span> wraps native symbols with type-safe
          metadata access. Every piece of Loom metadata flows through this system.
        </p>

        {/* ═══════════ Problem ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="alert-circle" size={20} color="var(--rose)"></loom-icon>
            <h2>The Problem</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Raw <span class="ic">Symbol</span> property access is completely untyped in JavaScript.
              Accessing metadata with <span class="ic">{`(ctor as any)[MY_SYMBOL]`}</span> gives you <span class="ic">any</span> —
              no autocomplete, no type checking, no safety.
            </div>
            <code-block lang="ts" code={`// The old way — completely untyped
const MY_META = Symbol("my:meta");

// No type checking — this could be anything
(ctor as any)[MY_META] = 42;
(ctor as any)[MY_META] = "oops";  // no error!
const val = (ctor as any)[MY_META];  // any`}></code-block>
          </div>
        </section>

        {/* ═══════════ LoomSymbol ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="shield-check" size={20} color="var(--emerald)"></loom-icon>
            <h2>LoomSymbol&lt;T&gt;</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">LoomSymbol&lt;T&gt;</span> wraps a native <span class="ic">symbol</span> and
              provides typed <span class="ic">from()</span>, <span class="ic">set()</span>, and <span class="ic">has()</span> methods.
              TypeScript enforces the correct type at every boundary.
            </div>
            <code-block lang="ts" code={`import { createSymbol } from "@toyz/loom";

// Create a typed symbol
const SERVICE_NAME = createSymbol<string>("service:name");

// Type-safe write — TS enforces string
SERVICE_NAME.set(ctor, "UserService");
SERVICE_NAME.set(ctor, 42);  // Type error!

// Type-safe read
const name = SERVICE_NAME.from(ctor);  // string | undefined

// Existence check
if (SERVICE_NAME.has(ctor)) {
  // ...
}`}></code-block>
          </div>
        </section>

        {/* ═══════════ createSymbol ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="plus-circle" size={20} color="var(--sky)"></loom-icon>
            <h2>createSymbol</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">{`createSymbol<T>(name: string): LoomSymbol<T>`}</div>
            <div class="dec-desc">
              Creates and registers a <span class="ic">LoomSymbol</span> in the global <span class="ic">SYMBOL_REGISTRY</span>.
              If a symbol with the same name already exists, returns the existing one — preventing
              duplicates across hot reloads or multiple imports.
            </div>
            <code-block lang="ts" code={`import { createSymbol } from "@toyz/loom";

// Plugin authors: define typed metadata symbols
const TRACK_META = createSymbol<TrackEntry[]>("analytics:track");
const FLAG_META  = createSymbol<FlagEntry[]>("flags:gated");

// Dedup — same name returns same instance
const a = createSymbol("my:thing");
const b = createSymbol("my:thing");
console.log(a === b);  // true`}></code-block>
          </div>
        </section>

        {/* ═══════════ API Reference ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--amethyst)"></loom-icon>
            <h2>API</h2>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">.from(target): T | undefined</div>
            <div class="dec-desc">
              Read metadata from the target. Returns <span class="ic">undefined</span> if not set.
              The return type is inferred from the symbol's generic parameter.
            </div>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">.set(target, value: T): void</div>
            <div class="dec-desc">
              Write metadata to the target. TypeScript enforces that <span class="ic">value</span> matches
              the symbol's type parameter <span class="ic">T</span>.
            </div>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">.has(target): boolean</div>
            <div class="dec-desc">
              Check whether the target has this symbol's metadata set.
            </div>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">.key: symbol</div>
            <div class="dec-desc">
              The underlying native <span class="ic">symbol</span>. Use this for direct property access
              when you need to bypass the typed API (e.g. in performance-critical internals).
            </div>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">.name: string</div>
            <div class="dec-desc">
              The human-readable name passed to <span class="ic">createSymbol()</span>.
              Used by <span class="ic">inspect()</span> and <span class="ic">SYMBOL_REGISTRY</span>.
            </div>
          </div>
        </section>

        {/* ═══════════ SYMBOL_REGISTRY ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="database" size={20} color="var(--amber)"></loom-icon>
            <h2>SYMBOL_REGISTRY</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">{`SYMBOL_REGISTRY: Map<string, LoomSymbol>`}</div>
            <div class="dec-desc">
              Global registry of all created symbols. Used by <span class="ic">inspect()</span> to enumerate
              component metadata. Every <span class="ic">createSymbol()</span> call auto-registers here.
            </div>
            <code-block lang="ts" code={`import { SYMBOL_REGISTRY } from "@toyz/loom";

// Enumerate all registered symbols
for (const [name, sym] of SYMBOL_REGISTRY) {
  console.log(name, sym.from(myComponent));
}`}></code-block>
          </div>
        </section>

        {/* ═══════════ Core Symbols ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--indigo)"></loom-icon>
            <h2>Core Symbols</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Loom ships with 18 core symbols that power the framework's internals.
              All are available from <span class="ic">@toyz/loom</span>:
            </div>
            <code-block lang="ts" code={`// State & Reactivity
REACTIVES        // string[] — reactive field names
PROPS            // { key: string }[] — observed attributes
COMPUTED_DIRTY   // symbol[] — dirty tracking keys
WATCHERS         // { field, key }[] — @watch bindings
EMITTERS         // { field, factory }[] — @emit bindings

// Lifecycle
CONNECT_HOOKS       // ConnectFn[] — runs on connect
FIRST_UPDATED_HOOKS // ConnectFn[] — runs after first render
MOUNT_HANDLERS      // string[] — @mount method keys
UNMOUNT_HANDLERS    // string[] — @unmount method keys

// Error Handling
CATCH_HANDLER    // Function — @catch_ handler
CATCH_HANDLERS   // Map<string, Function> — named handlers

// DI & Routing
INJECT_PARAMS    // { index, token }[] — @inject params
SERVICE_NAME     // string — @service("name") stamp
ROUTE_PROPS      // RouteBinding[] — @prop({param}) bindings
ROUTE_ENTER      // string[] — @onRouteEnter methods
ROUTE_LEAVE      // string[] — @onRouteLeave methods

// Other
ON_HANDLERS      // { event, key }[] — @on bindings
TRANSFORMS       // Map<string, Function> — @transform fns`}></code-block>
          </div>
        </section>
      </div>
    );
  }
}
