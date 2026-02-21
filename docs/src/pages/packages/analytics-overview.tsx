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
        <h1>@toyz/loom-analytics</h1>
        <p class="subtitle">Zero-dependency, transport-swappable analytics — decorator-driven event tracking.</p>

        <section>
          <div class="group-header">
            <loom-icon name="download" size={20} color="var(--emerald)"></loom-icon>
            <h2>Install</h2>
          </div>
          <code-block lang="bash" code={`npm install @toyz/loom-analytics`}></code-block>
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
            LoomAnalytics adds a single decorator — <span class="ic">@track</span> — that fires
            analytics events through a swappable <span class="ic">AnalyticsTransport</span>.
          </p>
          <p>
            Apply <span class="ic">@track</span> to <strong>classes</strong> (fire on mount),{" "}
            <strong>methods</strong> (fire after invocation), or <strong>accessors</strong> (fire
            on set). One decorator, three targets, zero boilerplate.
          </p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>1. Create a Transport</h2>
          </div>
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
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>2. Register via DI</h2>
          </div>
          <code-block lang="ts" code={`// main.tsx
import { app } from "@toyz/loom";
import { AnalyticsTransport } from "@toyz/loom-analytics";
import { PostHogTransport } from "./transports/posthog";

app.use(AnalyticsTransport, new PostHogTransport());
app.start();`}></code-block>
          <p>
            Transports are registered via Loom's DI container. Swap to{" "}
            <span class="ic">MockAnalytics</span> for testing — one line change.
          </p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>3. Decorate</h2>
          </div>
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
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--cyan)"></loom-icon>
            <h2>Custom Metadata</h2>
          </div>
          <p>
            Pass a second argument to <span class="ic">@track</span> for custom metadata:
          </p>
          <code-block lang="ts" code={`@track("page.settings", { section: "account" })
class AccountSettings extends LoomElement {}

@track("button.click", { variant: "primary" })
handleSubmit() { ... }`}></code-block>
          <p>
            Metadata is merged with automatic context (element tag, method name, property name, etc.)
            before being passed to your transport.
          </p>
        </section>
      </div>
    );
  }
}
