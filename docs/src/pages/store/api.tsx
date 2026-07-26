/**
 * Fetch — @api decorator docs  /fetch
 */
import { LoomElement } from "@toyz/loom";

export default class PageFetch extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Fetch" subtitle="Loading, error, retry and abort-on-unmount as one declaration — and a shorter form when the request is just a URL."></doc-header>

        <section>
          <p>Every hand-written fetch grows the same five pieces: a loading flag, an error field, a way to retry, a guard so a slow response cannot overwrite a newer one, and an abort on unmount. Skip the last two and you get the bugs that only appear on a slow connection — stale data winning, and a state update on a component that is gone.</p>
          <p><span class="ic">@api</span> declares all five. The request aborts when the element disconnects, a superseded response is discarded rather than applied, and <span class="ic">@intercept</span> lets you modify the request or the response without touching the call site.</p>
          <punch-matrix
            columns="FETCHES,BUILDS THE URL,CHECKS THE STATUS,WRAPS THE REQUEST"
            rows={[
              { name: "@api(fn)", punches: "FETCHES", note: "You write the request; you check it too" },
              { name: "@fetch(url)", punches: "FETCHES,BUILDS THE URL,CHECKS THE STATUS", note: "The common case, with the status check built in" },
              { name: "@intercept()", punches: "WRAPS THE REQUEST", note: "Runs before or after, without touching call sites" },
            ]}
          ></punch-matrix>
        </section>

        {/* ── Basic Usage ── */}
        <doc-section heading="Basic Usage">
          <api-entry sig="@api&lt;T&gt;(fetchFn)">
            <p>
              <span class="ic">@api</span> is an auto-accessor decorator that manages the full lifecycle
              of an async fetch — loading, error, data, and stale states — so you
              never write boilerplate for spinners or error handling again.
            </p>
            <code-block lang="ts" code={BASIC}></code-block>
          </api-entry>
        </doc-section>
        {/* ── ApiState<T> ── */}
        <doc-section heading="ApiState&lt;T&gt;">
            <p>The object returned by the accessor. All properties are reactive — accessing them triggers re-renders.</p>
          <table class="api-table">
            <thead><tr><th>Property / Method</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><span class="ic">.ok</span></td><td>True if the last fetch succeeded</td></tr>
              <tr><td><span class="ic">.data</span></td><td>Resolved data (<code>T | undefined</code>)</td></tr>
              <tr><td><span class="ic">.error</span></td><td>Error from the last fetch attempt</td></tr>
              <tr><td><span class="ic">.loading</span></td><td><code>true</code> only while there is nothing to show — the first fetch, before any data</td></tr>
              <tr><td><span class="ic">.fetching</span></td><td><code>true</code> whenever a request is in flight, including a refetch that already has data. Optional in the type, but always provided by <code>@api</code>.</td></tr>
              <tr><td><span class="ic">.stale</span></td><td><code>true</code> once <code>staleTime</code> has elapsed. The next read revalidates in the background.</td></tr>
              <tr><td><span class="ic">.refetch()</span></td><td>Manually re-run the fetch</td></tr>
              <tr><td><span class="ic">.invalidate()</span></td><td>Mark stale + trigger refetch</td></tr>
              <tr><td><span class="ic">.match({'{'}ok, err, loading?{'}'})</span></td><td>Tri-state pattern match — <code>loading</code> is optional</td></tr>
              <tr><td><span class="ic">.unwrap()</span></td><td>Return data or throw the error</td></tr>
              <tr><td><span class="ic">.unwrap_or(fallback)</span></td><td>Return data or fallback value</td></tr>
            </tbody>
          </table>
        </doc-section>
        {/* ── Options ── */}
        <doc-section heading="Options">
            <p>Use an options object for dynamic keys, interceptors, retries, or stale time.</p>
            <code-block lang="ts" code={OPTIONS_EXAMPLE}></code-block>

          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>fn</code></td><td><code>(el) =&gt; Promise&lt;T&gt;</code></td><td>The fetch function. Receives the host element.</td></tr>
              <tr><td><code>key</code></td><td><code>(el) =&gt; string</code></td><td>Dynamic key — when it changes, abort + refetch.</td></tr>
              <tr><td><code>use</code></td><td><code>string[]</code></td><td>Named interceptors to run <strong>before</strong> each fetch.</td></tr>
              <tr><td><code>pipe</code></td><td><code>string[]</code></td><td>Named interceptors to run <strong>after</strong> fetch (response transformers).</td></tr>
              <tr><td><code>staleTime</code></td><td><code>number</code></td><td>ms before data is stale (default: 0). The next read after that revalidates in the background.</td></tr>
              <tr><td><code>revalidate</code></td><td><code>boolean</code></td><td>Whether staleness triggers that background refetch (default: <code>true</code>).</td></tr>
              <tr><td><code>retry</code></td><td><code>number</code></td><td>Retry count with exponential backoff (default: 0).</td></tr>
              <tr><td><code>enabled</code></td><td><code>(el) =&gt; boolean</code></td><td>Gate the request. Nothing is fetched while this returns false.</td></tr>
            </tbody>
          </table>
        </doc-section>
        {/* ── @fetch ── */}
        <doc-section heading="@fetch — the common case">
          <p>
            Most <span class="ic">@api</span> declarations are the same four lines: build a URL
            from a prop, call fetch, check the response, parse JSON. Written by hand that is
            also four chances to get it wrong, and the third one usually gets skipped.
          </p>
          <api-entry sig="@fetch(url | options)">
            <p>
              Takes a URL, a function of the host, or an options object. Everything
              <span class="ic">@api</span> understands passes through — including
              <span class="ic">enabled</span>, <span class="ic">retry</span>,
              <span class="ic">use</span> and <span class="ic">pipe</span>.
            </p>
            <code-block lang="ts" code={FETCH_EXAMPLE}></code-block>
          </api-entry>

          <table class="api-table">
            <thead><tr><th>It handles</th><th>Because otherwise</th></tr></thead>
            <tbody>
              <tr>
                <td>Non-2xx becomes an <code>HttpError</code></td>
                <td><code>fetch()</code> resolves for 404 and 500, so a hand-rolled <code>.then(r =&gt; r.json())</code> lands the error page in <code>data</code> and reports <code>ok: true</code></td>
              </tr>
              <tr>
                <td>Interceptors apply</td>
                <td>It goes through <code>ctx.fetch</code>. A bare <code>fetch()</code> inside <code>fn</code> bypasses the context, which quietly drops the auth header an <code>@intercept</code> just set</td>
              </tr>
              <tr>
                <td>The key is the resolved URL</td>
                <td>A URL built from a prop refetches when that prop changes, with no separate <code>key</code> to keep in step — those two drifting apart is its own class of bug</td>
              </tr>
              <tr>
                <td><code>params</code> are serialised</td>
                <td>Empty and undefined values are dropped rather than sent as blanks, and the order is stable so the cache key is too</td>
              </tr>
            </tbody>
          </table>

          <doc-notification type="caution">
            The export is named <span class="ic">fetch</span>, so importing it shadows the global
            <span class="ic"> fetch</span> in that module. If you need both, import it as
            <span class="ic">{`{ fetch as fetchJson }`}</span>.
          </doc-notification>

          <p class="note">
            <span class="ic">as: "text"</span> returns the body as a string and
            <span class="ic">as: "response"</span> hands back the raw
            <span class="ic">Response</span> — useful for a HEAD request or a blob, where
            parsing is the caller's business.
          </p>
        </doc-section>

        {/* ── Gating ── */}
        <doc-section heading="Waiting for a prop">
          <p>
            An <span class="ic">@api</span> fires as soon as the accessor is first read, which is
            during the component's first render. If the URL depends on a prop that arrives
            later — a route param, an id passed from a parent — that first request goes out
            against <span class="ic">undefined</span>, and its failure then has to be explained
            away in the UI.
          </p>
          <p>
            <span class="ic">enabled</span> gates it. While the gate is shut nothing is
            requested, and the state reports <span class="ic">loading: false</span> with no
            data — because a request that has not been made is not a request that is pending.
            The fetch goes out on the first render after the gate opens.
          </p>
          <code-block lang="ts" code={ENABLED_EXAMPLE}></code-block>
          <doc-notification type="tip">
            Pair it with <span class="ic">key</span>. The gate decides <em>whether</em> to
            fetch; the key decides <em>when to fetch again</em>. A query that is gated on an id
            and keyed by it will fetch once when the id appears and again whenever it changes.
          </doc-notification>
        </doc-section>

        {/* ── loading vs fetching ── */}
        <doc-section heading="loading vs fetching">
          <p>
            Two different questions, and conflating them produces the flicker where a screen
            blanks itself every time it revalidates.
          </p>
          <table class="api-table">
            <thead>
              <tr><th>State</th><th><code>loading</code></th><th><code>fetching</code></th><th>Render</th></tr>
            </thead>
            <tbody>
              <tr><td>First fetch, nothing yet</td><td>true</td><td>true</td><td>A skeleton</td></tr>
              <tr><td>Loaded, idle</td><td>false</td><td>false</td><td>The data</td></tr>
              <tr><td>Refetching, data present</td><td>false</td><td>true</td><td>The data, plus a quiet indicator</td></tr>
              <tr><td>Gated shut</td><td>false</td><td>false</td><td>Whatever "nothing asked for" looks like</td></tr>
            </tbody>
          </table>
        </doc-section>

        {/* ── ApiStale ── */}
        <doc-section heading="Reacting to staleness elsewhere">
          <p>
            <span class="ic">.stale</span> and <span class="ic">.fetching</span> only tell the
            component that owns the accessor. Anything else that wants to react — a sync
            indicator in a toolbar, a cache layer, a second view that should refresh alongside —
            has no reference to it.
          </p>
          <p>
            So the transition is announced on the bus, and you subscribe the same way you
            subscribe to anything else. The event carries the resolved cache key, which for
            <span class="ic">@fetch</span> is the requested URL, so matching on a path prefix
            works.
          </p>
          <code-block lang="ts" code={STALE_EVENT}></code-block>
          <table class="api-table">
            <thead><tr><th>Field</th><th>What it holds</th></tr></thead>
            <tbody>
              <tr><td><code>name</code></td><td>The accessor's name, e.g. <code>"user"</code></td></tr>
              <tr><td><code>key</code></td><td>The resolved cache key — the URL, with params, for <code>@fetch</code></td></tr>
              <tr><td><code>host</code></td><td>The component the accessor lives on</td></tr>
            </tbody>
          </table>
          <doc-notification type="note">
            It fires once per stale transition, not once per read, and it fires whether or not
            the query revalidates — with <span class="ic">revalidate: false</span> this event is
            the signal, and with the default it announces that a background refetch is starting.
          </doc-notification>
          <p class="caution">
            The event is emitted from a microtask, never synchronously from the getter. A
            handler that reads <span class="ic">.data</span> or calls
            <span class="ic">scheduleUpdate()</span> would otherwise run inside the render that
            triggered it, and re-enter it.
          </p>
        </doc-section>

        {/* ── Interceptors ── */}
        <doc-section heading="Interceptors">
          <api-entry sig="@intercept()">
            <p>
              Define interceptors as class methods with <span class="ic">@intercept</span>.
              Reference them by method name in <span class="ic">use</span> (pre-fetch)
              or <span class="ic">pipe</span> (post-fetch).
            </p>
            <code-block lang="ts" code={INTERCEPTOR_EXAMPLE}></code-block>
          </api-entry>
            <h3>ApiCtx</h3>
            <p>The mutable context passed to interceptors.</p>
          <table class="api-table">
            <thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><span class="ic">ctx.url</span></td><td><code>string</code></td><td>Request URL — prepend base URL, add paths</td></tr>
              <tr><td><span class="ic">ctx.headers</span></td><td><code>Record&lt;string, string&gt;</code></td><td>Request headers — auth, content type</td></tr>
              <tr><td><span class="ic">ctx.params</span></td><td><code>Record&lt;string, string&gt;</code></td><td>Query params — merged as <code>?key=val</code></td></tr>
              <tr><td><span class="ic">ctx.init</span></td><td><code>RequestInit</code></td><td>Raw overrides — method, body, credentials</td></tr>
              <tr><td><span class="ic">ctx.signal</span></td><td><code>AbortSignal</code></td><td>Auto-managed abort signal (read-only)</td></tr>
              <tr><td><span class="ic">ctx.response</span></td><td><code>Response</code></td><td>Available only in <code>pipe</code> (post-fetch) interceptors</td></tr>
            </tbody>
          </table>
        </doc-section>
        {/* ── Error Handling ── */}
        <doc-section heading="Error Handling — @catch_">
            <p>
              <span class="ic">@catch_</span> unifies error handling for both render errors and
              async <span class="ic">@api</span> fetch failures. It comes in three forms:
            </p>
            <code-block lang="ts" code={CATCH_EXAMPLE}></code-block>

          <table class="api-table">
            <thead><tr><th>Form</th><th>Scope</th></tr></thead>
            <tbody>
              <tr><td><code>@catch_((err, el) =&gt; ...)</code></td><td>Class decorator — catch-all for render + all API errors</td></tr>
              <tr><td><code>@catch_</code></td><td>Method decorator — catch-all (handler as class method)</td></tr>
              <tr><td><code>@catch_("team")</code></td><td>Method decorator — scoped to a specific <code>@api</code> accessor by name</td></tr>
            </tbody>
          </table>
          <doc-notification type="note">
            Named handlers take priority: if <span class="ic">@catch_("team")</span> exists and
            the <span class="ic">team</span> accessor fails, only the named handler fires.
            Unmatched errors fall through to the general <span class="ic">@catch_</span>.
          </doc-notification>
        </doc-section>
        {/* ── Key Behaviors ── */}
        <doc-section heading="Key Behaviors">
          <table class="api-table">
            <thead><tr><th>Behavior</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td>Stale-While-Revalidate</td><td>During a refetch, old data stays visible. <code>loading</code> is only <code>true</code> when there's no data yet.</td></tr>
              <tr><td>Auto-Abort</td><td>When the key changes or the element disconnects, in-flight requests are automatically aborted via <code>AbortController</code>.</td></tr>
              <tr><td>Retry</td><td>Failed requests retry with exponential backoff: 200ms, 400ms, 800ms…</td></tr>
              <tr><td>Per-Instance State</td><td>Each element instance owns its own fetch lifecycle. For shared data, use a <code>@service</code> + <code>Reactive&lt;T&gt;</code>.</td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}

const BASIC = `import { LoomElement, component } from "@toyz/loom";
import { api } from "@toyz/loom/query";
import type { ApiState } from "@toyz/loom/query";

interface User { name: string; email: string; }

@component("user-profile")
class Profile extends LoomElement {
  @api<User>(() => fetch("/api/me").then(r => r.json()))
  accessor user!: ApiState<User>;

  update() {
    return this.user.match({
      loading: () => <div class="skeleton" />,
      ok:      (u) => <h1>{u.name}</h1>,
      err:     (e) => <p class="error">{e.message}</p>,
    });
  }
}`;

const FETCH_EXAMPLE = `import { fetch } from "@toyz/loom/query";

@component("user-card")
class UserCard extends LoomElement {
  @prop accessor userId = "";

  // URL from a prop: the key is derived from it, so this refetches when the
  // prop changes, and enabled keeps it quiet until there is an id at all.
  @fetch<User>({
    url: (el) => \`/api/users/\${el.userId}\`,
    enabled: (el) => Boolean(el.userId),
    use: ["auth"],          // @intercept handlers still apply
    retry: 2,
  })
  accessor user!: ApiState<User>;

  // The short form, when there is nothing to configure
  @fetch<Config>("/api/config")
  accessor config!: ApiState<Config>;
}`;

const ENABLED_EXAMPLE = `@component("user-card")
class UserCard extends LoomElement {
  @prop accessor userId = "";

  @api<User>({
    fn: (el) => fetch(\`/api/users/\${el.userId}\`).then((r) => r.json()),
    key: (el) => el.userId,
    enabled: (el) => Boolean(el.userId),   // nothing goes out until the id lands
  })
  accessor user!: ApiState<User>;

  update() {
    if (!this.userId) return <p>Pick someone.</p>;
    return this.user.match({
      loading: () => <p>Loading...</p>,
      ok: (u) => <p>{u.name}{this.user.fetching ? " (refreshing)" : ""}</p>,
      err: (e) => <p>{e.message}</p>,
    });
  }
}`;

const STALE_EVENT = `import { ApiStale } from "@toyz/loom/query";

@component("sync-indicator")
class SyncIndicator extends LoomElement {
  @reactive accessor refreshing = false;

  @on(ApiStale)
  onStale(e: ApiStale) {
    // key is the requested URL for @fetch, so match on a prefix
    if (e.key?.startsWith("/api/users")) {
      this.refreshing = true;
    }
  }
}`;

const OPTIONS_EXAMPLE = `@api<Post>({
  fn:  (el) => fetch(\`/api/posts/\${el.postId}\`),
  key: (el) => \`/api/posts/\${el.postId}\`,   // re-fetches when key changes
  use: ["auth"],                              // pre-fetch interceptors
  pipe: ["json"],                             // post-fetch response transformers
  staleTime: 30_000,                          // 30s before data is stale
  retry: 2,                                   // retry with exponential backoff
})
accessor post!: ApiState<Post>;`;

const INTERCEPTOR_EXAMPLE = `class ApiDemo extends LoomElement {
  // Pre-fetch: add auth header
  @intercept()
  auth(ctx: ApiCtx) {
    ctx.headers["Authorization"] = \`Bearer \${this.token}\`;
  }

  // Post-fetch: parse JSON response
  @intercept({ after: true })
  json(ctx: ApiCtx) {
    return ctx.response.json();
  }

  @api<User[]>({
    fn: () => fetch("/api/users"),
    use: ["auth"],       // runs auth() before fetch
    pipe: ["json"],      // runs json() after fetch
  })
  accessor users!: ApiState<User[]>;
}`;

const CATCH_EXAMPLE = `class Dashboard extends LoomElement {
  // Scoped — only catches errors from the "users" accessor
  @catch_("users")
  handleUsersError(err: unknown) {
    console.error("Users fetch failed:", err);
  }

  // Catch-all — catches render errors + any other API errors
  @catch_
  handleError(err: unknown) {
    this.shadow.innerHTML = \`<p>Something went wrong: \${err}</p>\`;
  }

  @api<User[]>({ fn: () => fetch("/api/users"), pipe: ["json"] })
  accessor users!: ApiState<User[]>;

  @api<Stats>({ fn: () => fetch("/api/stats").then(r => r.json()) })
  accessor stats!: ApiState<Stats>;
}`;
