/**
 * Fetch — @api decorator docs  /fetch
 */
import { LoomElement } from "@toyz/loom";

export default class PageFetch extends LoomElement {
  update() {
    return (
      <div>
        <h1>Fetch</h1>
        <p class="subtitle">Declarative async data fetching with interceptor pipelines and scoped error boundaries.</p>

        {/* ── Basic Usage ── */}
        <section>
          <div class="group-header">
            <loom-icon name="download" size={20} color="var(--emerald)"></loom-icon>
            <h2>Basic Usage</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@api&lt;T&gt;(fetchFn)</div>
            <div class="dec-desc">
              <span class="ic">@api</span> is an auto-accessor decorator that manages the full lifecycle
              of an async fetch — loading, error, data, and stale states — so you
              never write boilerplate for spinners or error handling again.
            </div>
            <code-block lang="ts" code={BASIC}></code-block>
          </div>
        </section>

        {/* ── ApiState<T> ── */}
        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--amber)"></loom-icon>
            <h2>ApiState&lt;T&gt;</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">The object returned by the accessor. All properties are reactive — accessing them triggers re-renders.</div>
          </div>
          <table class="api-table">
            <thead><tr><th>Property / Method</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><span class="ic">.ok</span></td><td>True if the last fetch succeeded</td></tr>
              <tr><td><span class="ic">.data</span></td><td>Resolved data (<code>T | undefined</code>)</td></tr>
              <tr><td><span class="ic">.error</span></td><td>Error from the last fetch attempt</td></tr>
              <tr><td><span class="ic">.loading</span></td><td><code>true</code> during initial fetch (not refetch)</td></tr>
              <tr><td><span class="ic">.stale</span></td><td><code>true</code> after <code>staleTime</code> has elapsed</td></tr>
              <tr><td><span class="ic">.refetch()</span></td><td>Manually re-run the fetch</td></tr>
              <tr><td><span class="ic">.invalidate()</span></td><td>Mark stale + trigger refetch</td></tr>
              <tr><td><span class="ic">.match({'{'}ok, err, loading?{'}'})</span></td><td>Tri-state pattern match — <code>loading</code> is optional</td></tr>
              <tr><td><span class="ic">.unwrap()</span></td><td>Return data or throw the error</td></tr>
              <tr><td><span class="ic">.unwrap_or(fallback)</span></td><td>Return data or fallback value</td></tr>
            </tbody>
          </table>
        </section>

        {/* ── Options ── */}
        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--accent)"></loom-icon>
            <h2>Options</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">Use an options object for dynamic keys, interceptors, retries, or stale time.</div>
            <code-block lang="ts" code={OPTIONS_EXAMPLE}></code-block>
          </div>

          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>fn</code></td><td><code>(el) =&gt; Promise&lt;T&gt;</code></td><td>The fetch function. Receives the host element.</td></tr>
              <tr><td><code>key</code></td><td><code>(el) =&gt; string</code></td><td>Dynamic key — when it changes, abort + refetch.</td></tr>
              <tr><td><code>use</code></td><td><code>string[]</code></td><td>Named interceptors to run <strong>before</strong> each fetch.</td></tr>
              <tr><td><code>pipe</code></td><td><code>string[]</code></td><td>Named interceptors to run <strong>after</strong> fetch (response transformers).</td></tr>
              <tr><td><code>staleTime</code></td><td><code>number</code></td><td>ms before data is considered stale (default: 0).</td></tr>
              <tr><td><code>retry</code></td><td><code>number</code></td><td>Retry count with exponential backoff (default: 0).</td></tr>
            </tbody>
          </table>
        </section>

        {/* ── Interceptors ── */}
        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--cyan)"></loom-icon>
            <h2>Interceptors</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@intercept()</div>
            <div class="dec-desc">
              Define interceptors as class methods with <span class="ic">@intercept</span>.
              Reference them by method name in <span class="ic">use</span> (pre-fetch)
              or <span class="ic">pipe</span> (post-fetch).
            </div>
            <code-block lang="ts" code={INTERCEPTOR_EXAMPLE}></code-block>
          </div>

          <div class="feature-entry">
            <h3>ApiCtx</h3>
            <div class="dec-desc">The mutable context passed to interceptors.</div>
          </div>
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
        </section>

        {/* ── Error Handling ── */}
        <section>
          <div class="group-header">
            <loom-icon name="shield" size={20} color="var(--rose)"></loom-icon>
            <h2>Error Handling — @catch_</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <span class="ic">@catch_</span> unifies error handling for both render errors and
              async <span class="ic">@api</span> fetch failures. It comes in three forms:
            </div>
            <code-block lang="ts" code={CATCH_EXAMPLE}></code-block>
          </div>

          <table class="api-table">
            <thead><tr><th>Form</th><th>Scope</th></tr></thead>
            <tbody>
              <tr><td><code>@catch_((err, el) =&gt; ...)</code></td><td>Class decorator — catch-all for render + all API errors</td></tr>
              <tr><td><code>@catch_</code></td><td>Method decorator — catch-all (handler as class method)</td></tr>
              <tr><td><code>@catch_("team")</code></td><td>Method decorator — scoped to a specific <code>@api</code> accessor by name</td></tr>
            </tbody>
          </table>
          <div class="note">
            Named handlers take priority: if <span class="ic">@catch_("team")</span> exists and
            the <span class="ic">team</span> accessor fails, only the named handler fires.
            Unmatched errors fall through to the general <span class="ic">@catch_</span>.
          </div>
        </section>

        {/* ── Key Behaviors ── */}
        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--amber)"></loom-icon>
            <h2>Key Behaviors</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Behavior</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td>Stale-While-Revalidate</td><td>During a refetch, old data stays visible. <code>loading</code> is only <code>true</code> when there's no data yet.</td></tr>
              <tr><td>Auto-Abort</td><td>When the key changes or the element disconnects, in-flight requests are automatically aborted via <code>AbortController</code>.</td></tr>
              <tr><td>Retry</td><td>Failed requests retry with exponential backoff: 200ms, 400ms, 800ms…</td></tr>
              <tr><td>Per-Instance State</td><td>Each element instance owns its own fetch lifecycle. For shared data, use a <code>@service</code> + <code>Reactive&lt;T&gt;</code>.</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}

const BASIC = `import { LoomElement, component, api } from "@toyz/loom";
import type { ApiState } from "@toyz/loom";

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
