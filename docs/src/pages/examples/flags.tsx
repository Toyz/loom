/**
 * Example — Feature Flags Demo (LoomFlags)
 *
 * Live demo: @flag decorator, <loom-flag> component, MockFlags
 */
import { LoomElement } from "@toyz/loom";
import "./components/flags-demo";

export default class ExampleFlags extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="@flag — Feature Flags" subtitle="Decorator-driven feature flags with @flag, <loom-flag>, and MockFlags — no backend required."></doc-header>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Demo</h2>
          </div>
          <p>
            Toggle flags on and off to see <span class="ic">@flag</span>-gated methods
            and <span class="ic">&lt;loom-flag&gt;</span> slots react in real time.
          </p>
          <flags-demo></flags-demo>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--accent)"></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">@flag(name)</span> on methods — no-op when flag is off</li>
            <li><span class="ic">MockFlags.enable() / disable()</span> — toggle flags at runtime</li>
            <li><span class="ic">FlagChanged</span> bus event — decorators react in real time</li>
            <li><span class="ic">app.use(FlagProvider, ...)</span> — DI-based provider swap</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="clipboard" size={20} color="var(--accent)"></loom-icon>
            <h2>Provider Setup</h2>
          </div>
          <code-block lang="ts" code={`import { FlagProvider } from "@toyz/loom-flags";
import { MockFlags } from "@toyz/loom-flags/testing";

const flags = new MockFlags();
app.use(FlagProvider, flags);`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/flags-demo.tsx"></source-block>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
