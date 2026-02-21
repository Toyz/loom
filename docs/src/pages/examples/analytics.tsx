/**
 * Example — Analytics Demo (LoomAnalytics)
 *
 * Live demo: @track decorator with MockAnalytics, event log
 */
import { LoomElement } from "@toyz/loom";
import "./components/analytics-demo";

export default class ExampleAnalytics extends LoomElement {
  update() {
    return (
      <div>
        <h1>@track — Event Tracking</h1>
        <p class="subtitle">
          Decorator-driven analytics with <span class="ic">@track</span> and{" "}
          <span class="ic">MockAnalytics</span> — no backend required.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Demo</h2>
          </div>
          <p>
            This component uses <span class="ic">@toyz/loom-analytics</span> with{" "}
            <span class="ic">MockAnalytics</span> as the transport.
            Click actions to fire <span class="ic">@track</span> events,
            toggle the theme accessor, and watch events stream into the log.
          </p>
          <analytics-demo></analytics-demo>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--accent)"></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">@track(event)</span> on methods — fires after each invocation</li>
            <li><span class="ic">@track(event)</span> on accessors — fires on every set</li>
            <li><span class="ic">MockAnalytics</span> — drop-in test transport with assertions</li>
            <li><span class="ic">app.use(AnalyticsTransport, ...)</span> — DI-based transport swap</li>
            <li>Custom metadata via second argument</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="clipboard" size={20} color="var(--accent)"></loom-icon>
            <h2>Transport Setup</h2>
          </div>
          <code-block lang="ts" code={`import { AnalyticsTransport, track } from "@toyz/loom-analytics";
import { MockAnalytics } from "@toyz/loom-analytics/testing";

const analytics = new MockAnalytics();
app.use(AnalyticsTransport, analytics);`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/analytics-demo.tsx"></source-block>
        </section>
      </div>
    );
  }
}
