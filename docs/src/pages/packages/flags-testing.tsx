/**
 * Packages — Flags Testing  /packages/flags-testing
 *
 * MockFlags usage, enable/disable, assertions.
 */
import { LoomElement } from "@toyz/loom";

export default class PageFlagsTesting extends LoomElement {
  update() {
    return (
      <div>
        <h1>Testing Feature Flags</h1>
        <p class="subtitle">
          <span class="ic">MockFlags</span> — drop-in test provider with assertions, no backend required.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
            <h2>Setup</h2>
          </div>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";
import { FlagProvider } from "@toyz/loom-flags";
import { MockFlags } from "@toyz/loom-flags/testing";

const flags = new MockFlags();
app.use(FlagProvider, flags);

beforeEach(() => flags.reset());`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Enable / Disable</h2>
          </div>
          <code-block lang="ts" code={`flags.enable("dark-mode");
expect(flags.isEnabled("dark-mode")).toBe(true);

flags.disable("dark-mode");
expect(flags.isEnabled("dark-mode")).toBe(false);`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Variants</h2>
          </div>
          <code-block lang="ts" code={`flags.setVariant("checkout-flow", "variant-b");
expect(flags.getVariant("checkout-flow", "control")).toBe("variant-b");

// Unset variants return the fallback
expect(flags.getVariant("unknown", "default")).toBe("default");`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="check" size={20} color="var(--emerald)"></loom-icon>
            <h2>Assertions</h2>
          </div>
          <code-block lang="ts" code={`// Assert a flag was checked (isEnabled was called)
flags.isEnabled("feature-x");
flags.assertChecked("feature-x");

// Assert a flag was NOT checked
flags.assertNotChecked("unused-flag");

// Assert current state
flags.enable("on");
flags.assertEnabled("on");
flags.assertDisabled("off");`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Reactive Testing</h2>
          </div>
          <p>
            <span class="ic">MockFlags</span> fires <span class="ic">FlagChanged</span> on the
            bus when you call <span class="ic">enable()</span> or <span class="ic">disable()</span>,
            so you can test real-time reactivity:
          </p>
          <code-block lang="ts" code={`// Component picks up the initial state
const el = document.createElement("my-flagged-el");
document.body.appendChild(el);
expect(el.flagEnabled).toBe(false);

// Enable the flag — component reacts
flags.enable("my-flag");
expect(el.flagEnabled).toBe(true);`}></code-block>
        </section>
      </div>
    );
  }
}
