/**
 * Event Bus — /core/events
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";

@route("/core/events")
@component("page-events")
export class PageEvents extends LoomElement {
  update() {
    return (
      <div>
        <h1>Event Bus</h1>
        <p class="subtitle">Typed, class-based events for decoupled communication.</p>

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
          <h2>The @on Decorator</h2>
          <p>In components and services, use <span class="ic">@on</span> for declarative event handling:</p>
          <code-block lang="ts" code={`import { component, LoomElement, on, reactive } from "@toyz/loom";

@component("user-banner")
class UserBanner extends LoomElement {
  @reactive userName = "";
  @reactive width = 0;

  @on(UserLoggedIn)
  handleLogin(e: UserLoggedIn) {
    this.userName = e.name;
  }

  // Also supports DOM events:
  @on(window, "resize")
  handleResize(e: Event) {
    this.width = window.innerWidth;
  }
}`}></code-block>
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
      </div>
    );
  }
}
