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

        <section>
          <p>Components need two different things from an event system, and conflating them is the usual source of confusion. One is a message published to whoever is listening, anywhere in the app. The other is a callback a parent hands to a child.</p>
          <p><span class="ic">@on</span> and <span class="ic">@emit</span> are the first: a typed bus keyed by event class, subscribed for exactly as long as the element is connected. <span class="ic">@event</span> is the second — it declares a typed callback prop. It stores a function; it does not dispatch a <span class="ic">CustomEvent</span>, so nothing outside the component can listen for it and it does not bubble.</p>
          <punch-matrix
            columns="TYPED,ON THE BUS,AUTO-UNSUBSCRIBES"
            rows={[
              { name: "@on", punches: "TYPED,ON THE BUS,AUTO-UNSUBSCRIBES", note: "Subscribes while connected" },
              { name: "@emit", punches: "TYPED,ON THE BUS", note: "Publishes when the field changes" },
              { name: "@event", punches: "TYPED", note: "A callback prop -- it dispatches nothing" },
            ]}
          ></punch-matrix>
        </section>

        {/* ═══════════ Define ═══════════ */}

        <doc-section heading="Define Events">
            <p>Events extend <span class="ic">LoomEvent</span> — a plain class with typed payloads:</p>
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
        </doc-section>
        {/* ═══════════ LoomEvent Static API ═══════════ */}

        <doc-section heading="LoomEvent Static API">
            <p>
              Every <span class="ic">LoomEvent</span> subclass inherits a set of static helpers for constructing,
              emitting, and inspecting events without boilerplate.
            </p>
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
        </doc-section>
        {/* ═══════════ Frame-Scoped Dedup ═══════════ */}

        <doc-section heading="Frame-Scoped Deduplication">
            <p>
              Override <span class="ic">get dedupeKey()</span> to enable frame-scoped dedup. If multiple emissions with the same key
              occur in the same synchronous flush, only the first reaches handlers. The seen set is cleared after the current microtask drains.
            </p>
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
        </doc-section>
        {/* ═══════════ Listen & Emit ═══════════ */}

        <doc-section heading="Listen &amp; Emit">
            <code-block lang="ts" code={`import { bus } from "@toyz/loom";

// Subscribe — returns an unsubscribe function
const unsub = bus.on(UserLoggedIn, (e) => {
  console.log(\`Welcome, \${e.name}!\`);
});

// Emit
bus.emit(new UserLoggedIn("123", "Alice"));

// Clean up
unsub();`}></code-block>
        </doc-section>
        {/* ═══════════ @on ═══════════ */}

        <doc-section heading="@on Decorator">

          <api-entry sig="@on(EventClass)">
            <div class="dec-sig">@on(target, eventName)</div>
            <p>
              Declarative event subscription. Auto-subscribed on connect, auto-cleaned on disconnect.
              Works with bus events or DOM EventTargets.
            </p>
            <code-block lang="ts" code={`// Bus event
@on(ColorSelect)
onColor(e: ColorSelect) { this.select(e.index); }

// DOM event
@on(window, "resize")
onResize() { this.width = window.innerWidth; }`}></code-block>
          </api-entry>
          <api-entry sig="@on(resolver, eventName)">
            <p>
              Pass a <span class="ic">resolver</span> function to lazily bind to targets that only exist at instance time —
              like the component's own shadow root, or elements resolved via <span class="ic">@query</span>.
            </p>
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
          </api-entry>
        </doc-section>
        {/* ═══════════ @emit ═══════════ */}

        <doc-section heading="@emit Decorator">
          <api-entry sig="@emit()">
            <div class="dec-sig">@emit(EventClass, factory)</div>
            <p>
              Auto-broadcast to the bus. On a method, the return value is emitted.
              On a field, fires via factory whenever the reactive value changes.
            </p>
            <code-block lang="ts" code={`// Method — return value is emitted
@emit()
placePixel(x: bigint, y: bigint): PixelPlaced {
  return new PixelPlaced(x, y, this.selectedColor);
}

// Field — factory converts value → event
@reactive @emit(ColorSelect, idx => new ColorSelect(idx, 0))
accessor selectedIndex = 0;`}></code-block>
          </api-entry>
        </doc-section>
        {/* ═══════════ Via LoomApp ═══════════ */}

        <doc-section heading="Via LoomApp">
            <p>
              The <span class="ic">app</span> singleton delegates to the same bus:
            </p>
            <code-block lang="ts" code={`import { app } from "@toyz/loom";

app.on(ThemeChanged, (e) => {
  document.body.className = e.theme;
});

app.emit(new ThemeChanged("dark"));`}></code-block>
        </doc-section>
        {/* ═══════════ useBus ═══════════ */}

        <doc-section heading="useBus()">
            <p>
              <span class="ic">useBus()</span> replaces the global bus instance — useful for test isolation:
            </p>
            <code-block lang="ts" code={`import { EventBus, useBus } from "@toyz/loom";

// Swap global bus for testing
const testBus = new EventBus();
useBus(testBus);

// All @on decorators and bus.emit() now use testBus`}></code-block>
        </doc-section>
        {/* ═══════════ once() & @on.once ═══════════ */}

        <doc-section heading="once() &amp; @on.once">
            <p>
              Fire-and-forget listeners — auto-unsubscribe after the first event fires.
            </p>
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
        </doc-section>
        {/* ═══════════ waitFor() ═══════════ */}

        <doc-section heading="waitFor()">
            <p>
              Promise-based listener — <span class="ic">await</span> the next event of a type. Optional timeout.
            </p>
            <code-block lang="ts" code={`// Wait for auth to complete
const auth = await bus.waitFor(AuthComplete);
console.log(auth.userId);

// With timeout — rejects if not received in 5s
try {
  const event = await bus.waitFor(AuthComplete, { timeout: 5000 });
} catch {
  console.error("Auth timed out");
}`}></code-block>
        </doc-section>
        {/* ═══════════ Cancellable Events ═══════════ */}

        <doc-section heading="Cancellable Events">
            <p>
              Call <span class="ic">event.cancel()</span> to stop dispatching to subsequent handlers and parent event types.
            </p>
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
        </doc-section>
        {/* ═══════════ Event Inheritance ═══════════ */}

        <doc-section heading="Event Inheritance">
            <p>
              Child events automatically fire handlers registered for parent types.
              The emit walks the prototype chain: <span class="ic">ChildEvent → ParentEvent → LoomEvent</span>.
            </p>
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
        </doc-section>
        {/* ═══════════ Example ═══════════ */}

        <doc-section heading="Example: Cross-Component Communication">
            <p>
              Events decouple components. A toolbar emits; any page can listen — no shared state needed:
            </p>
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
        </doc-section>
        <doc-section heading="Payload events">
          <p>
            An event that is only a bag of data does not need a constructor written for it.
            Declare the payload as a type parameter and the constructor comes with it, reachable
            as <span class="ic">.data</span>.
          </p>
          <code-block lang="ts" code={PAYLOAD_EVENT}></code-block>
          <p class="note">
            The classic form — your own constructor and your own fields — is unchanged and still
            the right choice when the event has behaviour or computed members. The type
            parameter defaults to <span class="ic">void</span>, so nothing that already extends{" "}
            <span class="ic">LoomEvent</span> is affected.
          </p>

          <h3>The payload is readonly</h3>
          <p>
            One event object reaches every handler, in registration order. So{" "}
            <span class="ic">.data</span> is typed <span class="ic">Readonly</span>: a handler
            that wrote to it — normalising a field, stashing a result on it — would change what
            every later handler sees, and which handler won would depend on registration order,
            which no line of either handler mentions.
          </p>
          <code-block lang="ts" code={READONLY_EVENT}></code-block>
          <p class="note">
            A compile-time guarantee, not <span class="ic">Object.freeze</span>. Freezing the
            payload measured 15% off emit, and most of that was not the freeze call but what it
            does afterwards: a frozen object reads slower for the rest of its life, and every
            handler is a reader. An opt-in flag checked per construction still cost 7%, because
            the check is per event while the mistake is per line of source.
          </p>
          <p class="note">
            Shallow, the same way <span class="ic">Object.freeze</span> would have been — an
            object nested inside the payload is still the caller's, and still shared.
          </p>

          <h3>Deriving the dedup key</h3>
          <p>
            With a payload declared, frame-scoped dedup can come from it rather than from a
            hand-written template string. <span class="ic">static dedupe = true</span> uses every
            field; a list of names uses only those, which is what you want when the payload
            carries something incidental like a timestamp or request id that should not make two
            events distinct.
          </p>
          <code-block lang="ts" code={DEDUPE_EVENT}></code-block>
          <p class="caution">
            It is opt-in on purpose. Deduping every event by default would silently drop the
            second of two identical commands — "increment" twice in one flush is two
            increments, not one.
          </p>
          <p class="note">
            The derived key is namespaced by a per-class token rather than the class name,
            because the bus keeps one dedup set for every event type and a minifier rewrites
            class names. That is the same hazard that makes <span class="ic">keepNames</span>{" "}
            matter at build time.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}

const PAYLOAD_EVENT = `import { LoomEvent } from "@toyz/loom";

// No constructor, no field declarations.
class ThemeChanged extends LoomEvent<{ theme: string }> {}

bus.emit(new ThemeChanged({ theme: "dark" }));

@on(ThemeChanged)
onTheme(e: ThemeChanged) {
  document.documentElement.dataset.theme = e.data.theme;
}`;

const READONLY_EVENT = `@on(ThemeChanged)
onTheme(e: ThemeChanged) {
  e.data.theme = "light";        // Error: readonly
  e.data = { theme: "light" };   // Error: readonly

  // To send a changed payload, send a changed event.
  bus.emit(e.clone({ data: { theme: "light" } }));
}`;

const DEDUPE_EVENT = `// Every field takes part
class Sync extends LoomEvent<{ id: string }> {
  static override dedupe = true;
}

// Only docId does: two saves of the same doc in one flush collapse,
// even though \`at\` differs
class Saved extends LoomEvent<{ docId: string; at: number }> {
  static override dedupe = ["docId"] as const;
}`;
