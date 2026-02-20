/**
 * Events — /decorators/events
 *
 * LoomEvent, EventBus, @on, @emit
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorEvents extends LoomElement {
  update() {
    return (
      <div>
        <h1>Events</h1>
        <p class="subtitle">Typed, class-based events and declarative event decorators.</p>

        <section>
          <h2>Define Events</h2>
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
        </section>

        <section>
          <h2>Listen &amp; Emit</h2>
          <code-block lang="ts" code={`import { bus } from "@toyz/loom";

// Subscribe — returns an unsubscribe function
const unsub = bus.on(UserLoggedIn, (e) => {
  console.log(\`Welcome, \${e.name}!\`);
});

// Emit
bus.emit(new UserLoggedIn("123", "Alice"));

// Clean up
unsub();`}></code-block>
        </section>

        <section>
          <h2>@on Decorator</h2>
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
        </section>

        <section>
          <h2>Shadow DOM &amp; Instance Targets</h2>
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
          <p>
            The resolver receives the component instance and must return an <span class="ic">EventTarget</span>.
            Listeners are auto-cleaned on disconnect, just like the static form.
          </p>
        </section>

        <section>
          <h2>@emit Decorator</h2>
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
        </section>

        <section>
          <h2>Via LoomApp</h2>
          <p>
            The <span class="ic">app</span> singleton delegates to the same bus:
          </p>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";

app.on(ThemeChanged, (e) => {
  document.body.className = e.theme;
});

app.emit(new ThemeChanged("dark"));`}></code-block>
        </section>

        <section>
          <h2>useBus()</h2>
          <p>
            <span class="ic">useBus()</span> replaces the global bus instance — useful for test isolation:
          </p>
          <code-block lang="ts" code={`import { EventBus, useBus } from "@toyz/loom";

// Swap global bus for testing
const testBus = new EventBus();
useBus(testBus);

// All @on decorators and bus.emit() now use testBus`}></code-block>
        </section>

        <section>
          <h2>Example: Cross-Component Communication</h2>
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
        </section>
      </div>
    );
  }
}
