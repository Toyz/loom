/**
 * Packages — Flags Overview  /packages/flags-overview
 *
 * Package intro, install, @flag decorator, <loom-flag> component, reactive updates.
 */
import { LoomElement } from "@toyz/loom";

export default class PageFlagsOverview extends LoomElement {
  update() {
    return (
      <div>
        <h1>@toyz/loom-flags</h1>
        <p class="subtitle">Feature flags for Loom — decorator-driven with real-time reactive updates.</p>

        <section>
          <div class="group-header">
            <loom-icon name="download" size={20} color="var(--emerald)"></loom-icon>
            <h2>Install</h2>
          </div>
          <code-block lang="bash" code={`npm install @toyz/loom-flags`}></code-block>
          <p>
            <span class="ic">@toyz/loom</span> is the only dependency.
          </p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <p>
            LoomFlags provides two APIs — a <span class="ic">@flag</span> decorator and a{" "}
            <span class="ic">&lt;loom-flag&gt;</span> component — both powered by a swappable{" "}
            <span class="ic">FlagProvider</span>.
          </p>
          <ul>
            <li><span class="ic">@flag</span> on <strong>classes</strong> — injects a reactive <span class="ic">flagEnabled</span> boolean</li>
            <li><span class="ic">@flag</span> on <strong>methods</strong> — guards execution (no-op when flag is off)</li>
            <li><span class="ic">&lt;loom-flag&gt;</span> — conditional rendering via <span class="ic">enabled</span>/<span class="ic">disabled</span> slots</li>
          </ul>
          <p>
            All flag checks are <strong>reactive</strong> — when a provider updates a flag
            (e.g. from a WebSocket push), every decorator and component re-evaluates automatically.
          </p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>1. Create a Provider</h2>
          </div>
          <code-block lang="ts" code={`import { FlagProvider } from "@toyz/loom-flags";

class LaunchDarklyProvider extends FlagProvider {
  isEnabled(flag: string, context?: Record<string, any>): boolean {
    return ldClient.variation(flag, context, false);
  }
  getVariant<T = string>(flag: string, fallback: T): T {
    return ldClient.variation(flag, {}, fallback);
  }
}`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>2. Register via DI</h2>
          </div>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";
import { FlagProvider } from "@toyz/loom-flags";

app.use(FlagProvider, new LaunchDarklyProvider());`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>3. Use the Decorator</h2>
          </div>
          <code-block lang="tsx" code={`import { flag } from "@toyz/loom-flags";

// Class — injects flagEnabled boolean
@flag("new-dashboard")
class Dashboard extends LoomElement {
  update() {
    return this.flagEnabled
      ? <new-dash />
      : <old-dash />;
  }
}

// Method — no-op when flag is off
@flag("beta-export")
handleExport() { ... }

// Dynamic context — fn receives element instance
@flag("premium", el => ({ plan: el.plan }))
class PremiumWidget extends LoomElement { ... }`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>4. Use the Component</h2>
          </div>
          <code-block lang="tsx" code={`import "@toyz/loom-flags"; // registers <loom-flag>

<loom-flag name="beta-feature">
  <new-widget slot="enabled" />
  <span slot="disabled">Coming soon…</span>
</loom-flag>`}></code-block>
          <p>
            Named slots <span class="ic">enabled</span> and <span class="ic">disabled</span> let you
            define both states declaratively. The component swaps which slot is visible.
          </p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--cyan)"></loom-icon>
            <h2>Real-Time Updates</h2>
          </div>
          <p>
            Flags are <strong>live</strong>. When a provider calls <span class="ic">set()</span>,
            a <span class="ic">FlagChanged</span> event fires on the Loom bus. Every{" "}
            <span class="ic">@flag</span> decorator and <span class="ic">&lt;loom-flag&gt;</span>{" "}
            component re-evaluates automatically:
          </p>
          <code-block lang="ts" code={`// WebSocket pushes flag change
socket.on("flag:update", ({ flag, enabled }) => {
  const provider = app.get(FlagProvider);
  provider.set(flag, enabled); // fires FlagChanged on bus
});

// Every @flag and <loom-flag> reacts — zero manual work`}></code-block>
        </section>
      </div>
    );
  }
}
