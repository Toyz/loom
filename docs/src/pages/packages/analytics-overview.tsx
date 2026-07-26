/**
 * Packages — Analytics Overview  /packages/analytics-overview
 *
 * Package intro, install, @track decorator, transport registration.
 */
import { LoomElement } from "@toyz/loom";

export default class PageAnalyticsOverview extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="@toyz/loom-analytics" subtitle="Zero-dependency, transport-swappable analytics — decorator-driven event tracking."></doc-header>

        <section>
          <p>Analytics calls have a way of ending up inline, so a method that saves a document also knows the name of your analytics vendor. Swapping vendors then means touching every one of those call sites, and testing anything means the test fires real events.</p>
          <p><span class="ic">@track</span> moves the call to a decorator and the vendor behind a transport. The method says what happened; where that goes is configured once.</p>
        </section>

        <doc-section heading="Install">
          <code-block lang="bash" code={`npm install @toyz/loom-analytics`}></code-block>
          <p>
            <span class="ic">@toyz/loom</span> is the only dependency.
          </p>
        </doc-section>
        <doc-section heading="How It Works">
          <p>
            LoomAnalytics adds a single decorator — <span class="ic">@track</span> — that fires
            analytics events through a swappable <span class="ic">AnalyticsTransport</span>.
          </p>
          <p>
            Apply <span class="ic">@track</span> to <strong>classes</strong> (fire on mount), <strong>methods</strong> (fire after invocation), or <strong>accessors</strong> (fire
            on set). One decorator, three targets, zero boilerplate.
          </p>
        </doc-section>
        <doc-section heading="1. Create a Transport">
          <code-block lang="ts" code={`import { AnalyticsTransport } from "@toyz/loom-analytics";

class PostHogTransport extends AnalyticsTransport {
  track(event: string, meta?: Record<string, any>): void {
    posthog.capture(event, meta);
  }
}`}></code-block>
          <p>
            Extend <span class="ic">AnalyticsTransport</span> and implement <span class="ic">track()</span>.
            That's it — plug in PostHog, Mixpanel, Amplitude, GA4, or roll your own.
          </p>
        </doc-section>
        <doc-section heading="2. Register via DI">
          <code-block lang="ts" code={`// main.tsx
import { app } from "@toyz/loom";
import { AnalyticsTransport } from "@toyz/loom-analytics";
import { PostHogTransport } from "./transports/posthog";

app.use(AnalyticsTransport, new PostHogTransport());
app.start();`}></code-block>
          <p>
            Transports are registered via Loom's DI container. Swap to <span class="ic">MockAnalytics</span> for testing — one line change.
          </p>
        </doc-section>
        <doc-section heading="3. Decorate">
          <code-block lang="tsx" code={`import { track } from "@toyz/loom-analytics";

// Class — fire on mount (page views)
@track("page.dashboard")
class Dashboard extends LoomElement { ... }

// Method — fire after invocation (actions)
class Settings extends LoomElement {
  @track("user.save")
  handleSave() { ... }

  // Accessor — fire on set (state changes)
  @track("theme.change")
  accessor theme = "dark";
}`}></code-block>
        </doc-section>
        <doc-section heading="Custom Metadata">
          <p>
            Pass a second argument to <span class="ic">@track</span> for custom metadata.
            Use a <strong>static object</strong> or a <strong>function</strong> that receives the
            element instance for dynamic values:
          </p>
          <code-block lang="ts" code={`// Static metadata
@track("page.settings", { section: "account" })
class AccountSettings extends LoomElement {}

// Dynamic metadata — fn receives the element instance
@track("nav.click", el => ({ route: el.currentRoute, userId: el.userId }))
handleNav() { ... }

@track("theme.set", el => ({ page: el.currentPage }))
accessor theme = "dark";`}></code-block>
          <p>
            Dynamic metadata is resolved at fire time, so it always reflects the
            current component state. It's merged with automatic context (element tag,
            method name, property name, etc.) before being passed to your transport.
          </p>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
