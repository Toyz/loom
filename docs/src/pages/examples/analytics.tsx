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
        <doc-header title="@track — Event Tracking" subtitle="Decorator-driven analytics with @track and MockAnalytics — no backend required."></doc-header>

        <section>
          <p>Every button below fires a decorated method, and the event it produced appears in the log beside it. Watch what the payload contains: the decorator captures the arguments, so the event carries the data without the method mentioning analytics at all.</p>
        </section>

        <doc-section heading="Demo">
          <p>
            This component uses <span class="ic">@toyz/loom-analytics</span> with <span class="ic">MockAnalytics</span> as the transport.
            Click actions to fire <span class="ic">@track</span> events,
            toggle the theme accessor, and watch events stream into the log.
          </p>
          <doc-demo>
            <analytics-demo></analytics-demo>
          </doc-demo>
        </doc-section>
        <doc-section heading="What This Shows">
          <ul>
            <li><span class="ic">@track(event)</span> on methods — fires after each invocation</li>
            <li><span class="ic">@track(event)</span> on accessors — fires on every set</li>
            <li><span class="ic">MockAnalytics</span> — drop-in test transport with assertions</li>
            <li><span class="ic">app.use(AnalyticsTransport, ...)</span> — DI-based transport swap</li>
            <li>Custom metadata via second argument</li>
          </ul>
        </doc-section>
        <doc-section heading="Transport Setup">
          <code-block lang="ts" code={`import { AnalyticsTransport, track } from "@toyz/loom-analytics";
import { MockAnalytics } from "@toyz/loom-analytics/testing";

const analytics = new MockAnalytics();
app.use(AnalyticsTransport, analytics);`}></code-block>
        </doc-section>
        <doc-section heading="Source">
          <source-block file="docs/src/pages/examples/components/analytics-demo.tsx"></source-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
