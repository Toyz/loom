/**
 * Packages — Analytics Testing  /packages/analytics-testing
 *
 * MockAnalytics usage, assertTracked, assertNotTracked, reset.
 */
import { LoomElement } from "@toyz/loom";

export default class PageAnalyticsTesting extends LoomElement {
  update() {
    return (
      <div>
        <h1>Analytics Testing</h1>
        <p class="subtitle">MockAnalytics — drop-in test transport with assertions.</p>

        <section>
          <div class="group-header">
            <loom-icon name="download" size={20} color="var(--emerald)"></loom-icon>
            <h2>Import</h2>
          </div>
          <code-block lang="ts" code={`import { MockAnalytics } from "@toyz/loom-analytics/testing";
import { AnalyticsTransport } from "@toyz/loom-analytics";`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
            <h2>Setup</h2>
          </div>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";

const analytics = new MockAnalytics();
app.use(AnalyticsTransport, analytics);`}></code-block>
          <p>
            Register <span class="ic">MockAnalytics</span> as your transport in test setup.
            All <span class="ic">@track</span> events will be recorded instead of sent to a backend.
          </p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="check" size={20} color="var(--emerald)"></loom-icon>
            <h2>Assertions</h2>
          </div>
          <code-block lang="ts" code={`// Assert an event was tracked
analytics.assertTracked("page.dashboard");

// Assert with metadata matching (partial)
analytics.assertTracked("button.click", { variant: "primary" });

// Assert an event was NOT tracked
analytics.assertNotTracked("page.error");

// Access raw events
console.log(analytics.events);
// → [{ event: "page.dashboard", meta: { element: "my-dashboard" }, timestamp: 1234 }]`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="refresh" size={20} color="var(--cyan)"></loom-icon>
            <h2>Reset</h2>
          </div>
          <code-block lang="ts" code={`// Clear all recorded events between tests
analytics.reset();
expect(analytics.events).toHaveLength(0);`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Full Test Example</h2>
          </div>
          <code-block lang="ts" code={`import { describe, it, expect, beforeEach } from "vitest";
import { app, LoomElement } from "@toyz/loom";
import { AnalyticsTransport, track } from "@toyz/loom-analytics";
import { MockAnalytics } from "@toyz/loom-analytics/testing";

let analytics: MockAnalytics;

beforeEach(() => {
  analytics = new MockAnalytics();
  app.use(AnalyticsTransport, analytics);
});

it("tracks method invocation", () => {
  class El extends LoomElement {
    @track("save")
    handleSave() {}
  }
  customElements.define("test-el", El);

  const el = document.createElement("test-el") as any;
  document.body.appendChild(el);
  el.handleSave();

  analytics.assertTracked("save", { method: "handleSave" });
});`}></code-block>
        </section>
      </div>
    );
  }
}
