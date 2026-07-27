/**
 * Decorators — Visibility & Network  /decorators/environment
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorEnvironment extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Visibility &amp; Network"
          subtitle="Stop doing work nobody is looking at, and know when the network went away."
        ></doc-header>

        <section>
          <p>Two things every non-trivial app ends up caring about, and two that are easy to wire wrongly. <span class="ic">document.hidden</span> and <span class="ic">navigator.onLine</span> are cheap to read but only useful alongside their events — so the usual outcome is one listener per component, leaked on disconnect.</p>
          <p>There is a single listener for each here, shared by every subscriber and attached only while somebody is listening.</p>
        </section>

        <doc-section heading="@visible / @online">
          <code-block lang="ts" code={BASIC}></code-block>
          <api-table
            head={["Decorator", "True when", "Note"]}
            rows={[
              [<code>@visible</code>, "The page is visible", "False when the tab is backgrounded or the window minimised"],
              [<code>@online</code>, "The browser believes it is online", "False is reliable; true is a hint"],
            ]}
          ></api-table>
          <p class="caution">
            <span class="ic">navigator.onLine</span> reports true for a machine on a network
            that cannot reach anything — a captive portal, a dead uplink. Treat false as
            reliable and true as a hint. It is good for backing off retries, not for deciding a
            request will succeed.
          </p>
        </doc-section>

        <doc-section heading="Queries already know">
          <p>
            An <span class="ic">@api</span> or <span class="ic">@fetch</span> with a{" "}
            <span class="ic">staleTime</span> does not revalidate while the page is hidden.
            A background tab refreshing on a timer spends requests — and on a phone, radio
            wake-ups — to update pixels nobody is looking at, and a tab left open overnight
            would keep doing it.
          </p>
          <code-block lang="ts" code={QUERY}></code-block>
          <p class="note">
            The refetch is deferred, not dropped: it happens when the page becomes visible
            again, and only if the data is still stale by then. Set{" "}
            <span class="ic">pauseWhenHidden: false</span> for a query that genuinely must keep
            running in the background.
          </p>
        </doc-section>

        <doc-section heading="Outside a component">
          <p>The same signals, for services and plain modules.</p>
          <code-block lang="ts" code={IMPERATIVE}></code-block>
          <p class="note">
            <span class="ic">app.start()</span> separately wires{" "}
            <span class="ic">visibilitychange</span> to call{" "}
            <span class="ic">suspend()</span> / <span class="ic">resume()</span> on services
            that implement them — see <loom-link to="/di/overview" style="color: var(--accent)">Services</loom-link>.
            These are the same signal made readable anywhere.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}

const BASIC = `import { component, visible, online } from "@toyz/loom";

@component("live-feed")
class LiveFeed extends LoomElement {
  @visible accessor visible = true;
  @online accessor online = true;

  update() {
    if (!this.online) return <p>Offline — showing cached results.</p>;
    return <feed-list paused={!this.visible} />;
  }
}`;

const QUERY = `@fetch<Prices>({
  url: "/api/prices",
  staleTime: 30_000,
  // pauseWhenHidden: true is the default
})
accessor prices!: ApiState<Prices>;`;

const IMPERATIVE = `import { isVisible, onVisibilityChange, isOnline, onOnlineChange } from "@toyz/loom";

isVisible();   // boolean
isOnline();    // boolean

const off = onVisibilityChange((visible) => {
  if (!visible) pausePolling();
});
off();         // one shared DOM listener, removed with the last subscriber`;
