/**
 * Store — Signals  /store/signals
 */
import { LoomElement } from "@toyz/loom";

export default class PageStoreSignals extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Signals" subtitle="TC39 Signals interop — future-proof reactivity with real DOM integration."></doc-header>

        <section>
          <div class="group-header">
            <loom-icon name="radio" size={20} color="var(--purple)"></loom-icon>
            <h2>Overview</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Loom's Signal layer bridges the <a href="https://github.com/tc39/proposal-signals" target="_blank">TC39 Signals proposal</a> with
              Loom's real-DOM trace engine. Unlike VDOM frameworks, Loom patches the actual DOM via morphing.
              Signals integrate by backing onto <span class="ic">Reactive&lt;T&gt;</span>, so dependency tracking, fast-patch bindings,
              and <span class="ic">scheduleUpdate()</span> work seamlessly.
            </div>
            <code-block lang="ts" code={`import { SignalState, SignalComputed, signal } from "@toyz/loom/store";`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="edit-3" size={20} color="var(--amber)"></loom-icon>
            <h2>@signal Decorator</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Works like <span class="ic">@reactive</span> but backed by a <span class="ic">SignalState&lt;T&gt;</span>.
              The accessor exposes the raw value for ergonomic templates. The backing Signal is exposed as
              <span class="ic">this.$signal_&lt;field&gt;</span> for interop with external Signal-based code.
            </div>
            <code-block lang="ts" code={`import { component, LoomElement } from "@toyz/loom";
import { signal } from "@toyz/loom/store";

@component("my-counter")
class Counter extends LoomElement {
  @signal accessor count = 0;

  update() {
    return (
      <div>
        <span>{() => this.count}</span>
        <button onClick={() => this.count++}>+1</button>
      </div>
    );
  }
}`}></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-desc">
              The <span class="ic">$signal_</span> accessor gives full Signal API access for interop scenarios:
            </div>
            <code-block lang="ts" code={`// Access the backing SignalState
const sig = this.$signal_count;

sig.get();     // read (trace-tracked)
sig.peek();    // read (untracked)
sig.set(42);   // write (triggers re-render)

// Pass to external Signal-based libraries
externalLib.observe(sig);`}></code-block>
          </div>

          <table class="api-table">
            <thead><tr><th>Feature</th><th>@reactive</th><th>@signal</th></tr></thead>
            <tbody>
              <tr><td>Backing type</td><td><span class="ic">Reactive&lt;T&gt;</span></td><td><span class="ic">SignalState&lt;T&gt;</span></td></tr>
              <tr><td>Accessor value</td><td>Raw value</td><td>Raw value</td></tr>
              <tr><td>Signal API</td><td>—</td><td><span class="ic">this.$signal_field</span></td></tr>
              <tr><td>@watch</td><td>✓</td><td>✓</td></tr>
              <tr><td>Trace engine</td><td>✓</td><td>✓</td></tr>
              <tr><td>Equality check</td><td>Reference (<span class="ic">!==</span>)</td><td><span class="ic">Object.is</span></td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="box" size={20} color="var(--emerald)"></loom-icon>
            <h2>SignalState&lt;T&gt;</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              A read-write Signal compatible with the TC39 <span class="ic">Signal.State</span> API. Backed by <span class="ic">Reactive&lt;T&gt;</span>,
              so reads via <span class="ic">.get()</span> are tracked by the trace engine.
            </div>
            <code-block lang="ts" code={`import { SignalState } from "@toyz/loom/store";

const counter = new SignalState(0);

counter.get();    // 0 — tracked by trace engine
counter.set(1);   // triggers dependent re-renders
counter.peek();   // read without tracking

// Subscribe to changes
counter.subscribe((value, prev) => {
  console.log(\`\${prev} → \${value}\`);
});`}></code-block>
          </div>

          <table class="api-table">
            <thead><tr><th>Method</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><span class="ic">.get()</span></td><td>Read value (trace-tracked)</td></tr>
              <tr><td><span class="ic">.set(value)</span></td><td>Write value (triggers subscribers)</td></tr>
              <tr><td><span class="ic">.peek()</span></td><td>Read without trace tracking</td></tr>
              <tr><td><span class="ic">.subscribe(fn)</span></td><td>Listen for changes. Returns unsubscribe.</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="cpu" size={20} color="var(--cyan)"></loom-icon>
            <h2>SignalComputed&lt;T&gt;</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              A read-only computed Signal. Lazily evaluates a callback, caches the result, and auto-tracks dependencies.
              Re-evaluates only when a dependency changes.
            </div>
            <code-block lang="ts" code={`import { SignalState, SignalComputed } from "@toyz/loom/store";

const count = new SignalState(3);
const doubled = new SignalComputed(() => count.get() * 2);

doubled.get();  // 6 — lazy, memoized
count.set(5);
doubled.get();  // 10 — recomputed

// Dispose when no longer needed
doubled.dispose();`}></code-block>
          </div>

          <table class="api-table">
            <thead><tr><th>Method</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><span class="ic">.get()</span></td><td>Read computed value (lazy, trace-tracked)</td></tr>
              <tr><td><span class="ic">.peek()</span></td><td>Read without trace tracking</td></tr>
              <tr><td><span class="ic">.subscribe(fn)</span></td><td>Listen for value changes</td></tr>
              <tr><td><span class="ic">.dispose()</span></td><td>Clean up dependency subscriptions</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="repeat" size={20} color="var(--rose)"></loom-icon>
            <h2>Converters</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Bridge between Loom's <span class="ic">Reactive&lt;T&gt;</span> and external Signal ecosystems.
            </div>
          </div>

          <div class="feature-entry">
            <h3>toSignal(reactive) → SignalState</h3>
            <div class="dec-desc">
              Wraps an existing <span class="ic">Reactive&lt;T&gt;</span> as a Signal. Shares the same backing Reactive — zero overhead.
            </div>
            <code-block lang="ts" code={`import { Reactive } from "@toyz/loom/store";
import { toSignal } from "@toyz/loom/store";

const count = new Reactive(0);
const sig = toSignal(count);

sig.get();     // 0 — reads from same Reactive
sig.set(5);    // count.value is now 5
count.set(10); // sig.get() is now 10`}></code-block>
          </div>

          <div class="feature-entry">
            <h3>fromSignal(signal, subscribe?) → Reactive</h3>
            <div class="dec-desc">
              Wraps an external Signal as a Loom <span class="ic">Reactive&lt;T&gt;</span>. Since external Signals
              may not have subscribe, you provide a callback that hooks into your framework's effect system.
            </div>
            <code-block lang="ts" code={`import { fromSignal } from "@toyz/loom/store";

// Wrap external TC39 Signal
const loomReactive = fromSignal(externalSignal, (onChange) => {
  // Use your framework's effect system to detect changes
  return myFramework.effect(() => {
    externalSignal.get(); // track
    onChange();            // notify Loom
  });
});

// Now usable with @watch, trace engine, components, etc.`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="git-merge" size={20} color="var(--sky)"></loom-icon>
            <h2>How It Works with Real DOM</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Unlike VDOM frameworks, Loom patches the real DOM. The trace engine records which
              <span class="ic">Reactive</span> instances are read during <span class="ic">update()</span>.
              Signals integrate seamlessly because <span class="ic">SignalState.get()</span> calls
              <span class="ic">Reactive.value</span> under the hood.
            </div>
            <code-block lang="ts" code={`// The rendering pipeline:
//
// 1. Component.update() runs in startTrace()/endTrace()
// 2. SignalState.get() → Reactive.value → recorded as dependency
// 3. SignalState.set() → Reactive.set() → version bump
// 4. scheduleUpdate() → hasDirtyDeps() detects change
// 5. Morph engine patches only changed DOM nodes
//
// For closure bindings: {() => counter.get()}
// The fast-patch path re-evaluates just that patcher — no full morph.`}></code-block>
          </div>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
