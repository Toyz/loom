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
        <doc-header title="Typed Symbols" subtitle="LoomSymbol<T> wraps native symbols with type-safe metadata access. Every piece of Loom metadata flows through this system."></doc-header>

        <section>
          <p>Decorators need somewhere to record what they were told, and the class is the obvious place. Storing it as a string-keyed property means two libraries can collide, and a subclass silently shares its parent's array — mutate it in the child and the parent's metadata changes too.</p>
          <p><span class="ic">LoomSymbol&lt;T&gt;</span> wraps a native symbol with a typed accessor for reading and writing that metadata. It reads through the prototype chain, so a subclass sees what its parent declared, and its copy-on-write helpers make the value own to the subclass before mutating it — which is what keeps sibling subclasses from sharing one Map.</p>
        </section>

        {/* ═══════════ Problem ═══════════ */}

        <doc-section heading="The Problem">
            <p>
              Raw <span class="ic">Symbol</span> property access is completely untyped in JavaScript.
              Accessing metadata with <span class="ic">{`(ctor as any)[MY_SYMBOL]`}</span> gives you <span class="ic">any</span> —
              no autocomplete, no type checking, no safety.
            </p>
            <code-block lang="ts" code={`// The old way — completely untyped
const MY_META = Symbol("my:meta");

// No type checking — this could be anything
(ctor as any)[MY_META] = 42;
(ctor as any)[MY_META] = "oops";  // no error!
const val = (ctor as any)[MY_META];  // any`}></code-block>
        </doc-section>
        {/* ═══════════ LoomSymbol ═══════════ */}

        <doc-section heading="LoomSymbol&lt;T&gt;">
            <p>
              <span class="ic">LoomSymbol&lt;T&gt;</span> wraps a native <span class="ic">symbol</span> and
              provides typed <span class="ic">from()</span>, <span class="ic">set()</span>, and <span class="ic">has()</span> methods.
              TypeScript enforces the correct type at every boundary.
            </p>
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
        </doc-section>
        {/* ═══════════ createSymbol ═══════════ */}

        <doc-section heading="createSymbol">
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
        </doc-section>
        {/* ═══════════ API Reference ═══════════ */}

        <doc-section heading="API">

          <api-entry sig=".from(target): T | undefined">
            <p>
              Read metadata from the target. Returns <span class="ic">undefined</span> if not set.
              The return type is inferred from the symbol's generic parameter.
            </p>
          </api-entry>
          <api-entry sig=".set(target, value: T): void">
            <p>
              Write metadata to the target. TypeScript enforces that <span class="ic">value</span> matches
              the symbol's type parameter <span class="ic">T</span>.
            </p>
          </api-entry>
          <api-entry sig=".has(target): boolean">
            <p>
              Check whether the target has this symbol's metadata set.
            </p>
          </api-entry>
          <api-entry sig=".key: symbol">
            <p>
              The underlying native <span class="ic">symbol</span>. Use this for direct property access
              when you need to bypass the typed API (e.g. in performance-critical internals).
            </p>
          </api-entry>
          <api-entry sig=".name: string">
            <p>
              The human-readable name passed to <span class="ic">createSymbol()</span>.
              Used by <span class="ic">inspect()</span> and <span class="ic">SYMBOL_REGISTRY</span>.
            </p>
          </api-entry>
        </doc-section>
        {/* ═══════════ SYMBOL_REGISTRY ═══════════ */}

        <doc-section heading="SYMBOL_REGISTRY">
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
        </doc-section>
        {/* ═══════════ Core Symbols ═══════════ */}

        <doc-section heading="Core Symbols">
            <p>
              Loom ships with 18 core symbols that power the framework's internals.
              All are available from <span class="ic">@toyz/loom</span>:
            </p>
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
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
