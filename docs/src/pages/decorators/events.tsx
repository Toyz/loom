/**
 * Events — /decorators/events
 *
 * LoomEvent, EventBus, @on, @on.once, @emit, once, waitFor, cancel, inheritance
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorEvents extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Events" subtitle="Typed, class-based events and declarative event decorators."></doc-header>

        {/* ═══════════ Define ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="broadcast" size={20} color="var(--emerald)"></loom-icon>
            <h2>Define Events</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">Events extend <span class="ic">LoomEvent</span> — a plain class with typed payloads:</div>
            <code-block lang="ts" code={`import { LoomEvent } from "@toyz/loom";

export class UserLoggedIn extends LoomEvent {
  constructor(
    public userId: string,
    public name: string,
  ) {
    super();
  }
}

export class ThemeChanged extends LoomEvent {
  constructor(public theme: "light" | "dark") {
    super();
  }
}`}></code-block>
          </div>
        </section>

        {/* ═══════════ LoomEvent Static API ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>LoomEvent Static API</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Every <span class="ic">LoomEvent</span> subclass inherits a set of static helpers for constructing,
              emitting, and inspecting events without boilerplate.
            </div>
            <code-block lang="ts" code={`// Create an instance (typed as the subclass — no cast needed)
const e = UserLoggedIn.create("123", "Alice");

// Create AND emit in one call
UserLoggedIn.dispatch("123", "Alice");

// Type guard — narrows unknown → UserLoggedIn
if (UserLoggedIn.is(someEvent)) {
  console.log(someEvent.name); // fully typed
}

// Shallow clone with overrides — useful before re-emitting
const e2 = e.clone({ name: "Bob" });
bus.emit(e2);

// Serialize to plain object (strips methods, keeps data fields)
const json = e.toJSON(); // { userId: "123", name: "Alice", timestamp: ... }

// Auto-stamped timestamp on every event
console.log(e.timestamp); // Date.now() at construction`}></code-block>
          </div>
        </section>

        {/* ═══════════ Frame-Scoped Dedup ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="filter" size={20} color="var(--amber)"></loom-icon>
            <h2>Frame-Scoped Deduplication</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Override <span class="ic">get dedupeKey()</span> to enable frame-scoped dedup. If multiple emissions with the same key
              occur in the same synchronous flush, only the first reaches handlers. The seen set is cleared after the current microtask drains.
            </div>
            <code-block lang="ts" code={`class ThemeChanged extends LoomEvent {
  constructor(public theme: "light" | "dark") { super(); }

  // Return a stable string key to opt into dedup
  override get dedupeKey() { return \`theme:\${this.theme}\`; }
}

// Even if 10 components all emit this in the same flush...
ThemeChanged.dispatch("dark");
ThemeChanged.dispatch("dark");
ThemeChanged.dispatch("dark");
// → handlers fire exactly ONCE`}></code-block>
            <doc-notification type="note">
              Events that return <span class="ic">undefined</span> from <span class="ic">dedupeKey</span> (the default)
              are never deduplicated — this is opt-in only. Dedup is per-key, per-bus-instance, and resets after each microtask.
            </doc-notification>
          </div>
        </section>

        {/* ═══════════ Listen & Emit ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--amber)"></loom-icon>
            <h2>Listen &amp; Emit</h2>
          </div>
          <div class="feature-entry">
            <code-block lang="ts" code={`import { bus } from "@toyz/loom";

// Subscribe — returns an unsubscribe function
const unsub = bus.on(UserLoggedIn, (e) => {
  console.log(\`Welcome, \${e.name}!\`);
});

// Emit
bus.emit(new UserLoggedIn("123", "Alice"));

// Clean up
unsub();`}></code-block>
          </div>
        </section>


        {/* ═══════════ @on ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--accent)"></loom-icon>
            <h2>@on Decorator</h2>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">@on(EventClass)</div>
            <div class="dec-sig">@on(target, eventName)</div>
            <div class="dec-desc">
              Declarative event subscription. Auto-subscribed on connect, auto-cleaned on disconnect.
              Works with bus events or DOM EventTargets.
            </div>
            <code-block lang="ts" code={`// Bus event
@on(ColorSelect)
onColor(e: ColorSelect) { this.select(e.index); }

// DOM event
@on(window, "resize")
onResize() { this.width = window.innerWidth; }`}></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">@on(resolver, eventName)</div>
            <div class="dec-desc">
              Pass a <span class="ic">resolver</span> function to lazily bind to targets that only exist at instance time —
              like the component's own shadow root, or elements resolved via <span class="ic">@query</span>.
            </div>
            <code-block lang="ts" code={`// Listen to scroll events on the shadow root
@on(el => el.shadow, "scroll")
onShadowScroll(e: Event) { this.scrollY = (e.target as Element).scrollTop; }

// Listen to input events on a queried element
@on(el => el.formEl, "submit")
onSubmit(e: Event) { e.preventDefault(); this.save(); }`}></code-block>
            <doc-notification type="note">
              The resolver receives the component instance and must return an <span class="ic">EventTarget</span>.
              Listeners are auto-cleaned on disconnect, just like the static form.
            </doc-notification>
          </div>
        </section>

        {/* ═══════════ @emit ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--rose)"></loom-icon>
            <h2>@emit Decorator</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@emit()</div>
            <div class="dec-sig">@emit(EventClass, factory)</div>
            <div class="dec-desc">
              Auto-broadcast to the bus. On a method, the return value is emitted.
              On a field, fires via factory whenever the reactive value changes.
            </div>
            <code-block lang="ts" code={`// Method — return value is emitted
@emit()
placePixel(x: bigint, y: bigint): PixelPlaced {
  return new PixelPlaced(x, y, this.selectedColor);
}

// Field — factory converts value → event
@reactive @emit(ColorSelect, idx => new ColorSelect(idx, 0))
accessor selectedIndex = 0;`}></code-block>
          </div>
        </section>

        {/* ═══════════ Via LoomApp ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="cube" size={20} color="var(--cyan)"></loom-icon>
            <h2>Via LoomApp</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              The <span class="ic">app</span> singleton delegates to the same bus:
            </div>
            <code-block lang="ts" code={`import { app } from "@toyz/loom";

app.on(ThemeChanged, (e) => {
  document.body.className = e.theme;
});

app.emit(new ThemeChanged("dark"));`}></code-block>
          </div>
        </section>

        {/* ═══════════ useBus ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="refresh" size={20} color="var(--amber)"></loom-icon>
            <h2>useBus()</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">useBus()</span> replaces the global bus instance — useful for test isolation:
            </div>
            <code-block lang="ts" code={`import { EventBus, useBus } from "@toyz/loom";

// Swap global bus for testing
const testBus = new EventBus();
useBus(testBus);

// All @on decorators and bus.emit() now use testBus`}></code-block>
          </div>
        </section>

        {/* ═══════════ once() & @on.once ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="target" size={20} color="var(--amber)"></loom-icon>
            <h2>once() &amp; @on.once</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Fire-and-forget listeners — auto-unsubscribe after the first event fires.
            </div>
            <code-block lang="ts" code={`// Imperative — on the bus
const unsub = bus.once(AuthComplete, (e) => {
  console.log("Authenticated!", e.userId);
});
// handler fires once, then auto-removes. unsub() cancels before fire.

// Declarative — as a decorator
@on.once(AuthComplete)
handleAuth(e: AuthComplete) {
  this.userId = e.userId;
  // never fires again — auto-removed after first call
}`}></code-block>
          </div>
        </section>

        {/* ═══════════ waitFor() ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="clock" size={20} color="var(--cyan)"></loom-icon>
            <h2>waitFor()</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Promise-based listener — <span class="ic">await</span> the next event of a type. Optional timeout.
            </div>
            <code-block lang="ts" code={`// Wait for auth to complete
const auth = await bus.waitFor(AuthComplete);
console.log(auth.userId);

// With timeout — rejects if not received in 5s
try {
  const event = await bus.waitFor(AuthComplete, { timeout: 5000 });
} catch {
  console.error("Auth timed out");
}`}></code-block>
          </div>
        </section>

        {/* ═══════════ Cancellable Events ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="x-circle" size={20} color="var(--rose)"></loom-icon>
            <h2>Cancellable Events</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Call <span class="ic">event.cancel()</span> to stop dispatching to subsequent handlers and parent event types.
            </div>
            <code-block lang="ts" code={`bus.on(FormSubmit, (e) => {
  if (!isValid(e.data)) {
    e.cancel(); // stops all subsequent handlers
    showError("Invalid form");
  }
});

bus.on(FormSubmit, (e) => {
  // This handler never runs if cancel() was called above
  saveToDB(e.data);
});`}></code-block>
          </div>
        </section>

        {/* ═══════════ Event Inheritance ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="git-branch" size={20} color="var(--accent)"></loom-icon>
            <h2>Event Inheritance</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Child events automatically fire handlers registered for parent types.
              The emit walks the prototype chain: <span class="ic">ChildEvent → ParentEvent → LoomEvent</span>.
            </div>
            <code-block lang="ts" code={`class UIEvent extends LoomEvent {
  constructor(public source: string) { super(); }
}

class ClickEvent extends UIEvent {
  constructor(source: string, public x: number, public y: number) {
    super(source);
  }
}

// Catches ALL UI events — clicks, hovers, keypresses, etc.
bus.on(UIEvent, (e) => analytics.track(e.source));

// Also fires the UIEvent handler above!
bus.emit(new ClickEvent("button", 10, 20));`}></code-block>
            <doc-notification type="note">
              <span class="ic">cancel()</span> stops both handler iteration and parent propagation.
              Parent-only listeners are never fired for child events they didn't subscribe to.
            </doc-notification>
          </div>
        </section>

        {/* ═══════════ Example ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--emerald)"></loom-icon>
            <h2>Example: Cross-Component Communication</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Events decouple components. A toolbar emits; any page can listen — no shared state needed:
            </div>
            <code-block lang="ts" code={`// shared/events.ts
import { LoomEvent } from "@toyz/loom";

export class ThemeChanged extends LoomEvent {
  constructor(public theme: "light" | "dark") { super(); }
}

// components/toolbar.ts
@component("app-toolbar")
class Toolbar extends LoomElement {
  @emit()
  toggleTheme(): ThemeChanged {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    return new ThemeChanged(next);
  }

  update() {
    return <button onClick={() => this.toggleTheme()}>Toggle Theme</button>;
  }
}

// components/page.ts — no imports from toolbar needed
@component("app-page")
class Page extends LoomElement {
  @reactive accessor theme: "light" | "dark" = "dark";

  @on(ThemeChanged)
  onTheme(e: ThemeChanged) {
    this.theme = e.theme;
    document.body.dataset.theme = e.theme;
  }

  update() {
    return <main class={this.theme}>{/* ... */}</main>;
  }
}`}></code-block>
          </div>
        </section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}
