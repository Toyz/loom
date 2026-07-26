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
          <p>Toggle a flag and watch what re-renders. Nothing subscribes and nothing polls — the flag is reactive, so reading it in a template is the entire wiring. The interesting case is the last one, where a flag flips while a component is mid-list.</p>
        </section>

        <section>
          <div class="group-header">
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
            <h2>Provider Setup</h2>
          </div>
          <code-block lang="ts" code={`import { FlagProvider } from "@toyz/loom-flags";
import { MockFlags } from "@toyz/loom-flags/testing";

const flags = new MockFlags();
app.use(FlagProvider, flags);`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/flags-demo.tsx"></source-block>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
