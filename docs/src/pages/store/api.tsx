/**
 * Store — @api  /store/api
 */
import { LoomElement } from "@toyz/loom";

export default class PageStoreApi extends LoomElement {
  update() {
    return (
      <div>
        <h1>@api — Data Fetching</h1>
        <p class="subtitle">Decorator-driven async data fetching with named interceptors.</p>

        <section>
          <h2>Basic Usage</h2>
          <p>
            <span class="ic">@api</span> is an auto-accessor decorator that manages the full lifecycle
            of an async fetch — loading, error, data, and stale states — so you
            never write boilerplate for spinners or error handling again.
          </p>
          <code-block lang="ts" code={`import { LoomElement, component, api } from "@toyz/loom";
import type { ApiState } from "@toyz/loom";

interface User { name: string; email: string; }

@component("user-profile")
class Profile extends LoomElement {
  @api<User>(() => fetch("/api/me").then(r => r.json()))
  accessor user!: ApiState<User>;

  update() {
    const q = this.user;
    if (q.loading) return <div class="skeleton" />;
    if (q.error)   return <p class="error">{q.error.message}</p>;
    return <h1>{q.data!.name}</h1>;
  }
}`}></code-block>
        </section>

        <section>
          <h2>ApiState&lt;T&gt;</h2>
          <p>The object returned by the accessor. All properties are reactive — accessing them triggers re-renders.</p>
          <table class="api-table">
            <thead><tr><th>Property / Method</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>.data</code></td><td>Resolved data (<code>T | undefined</code>)</td></tr>
              <tr><td><code>.error</code></td><td>Error from the last fetch attempt</td></tr>
              <tr><td><code>.loading</code></td><td><code>true</code> during initial fetch (not refetch)</td></tr>
              <tr><td><code>.stale</code></td><td><code>true</code> after <code>staleTime</code> has elapsed</td></tr>
              <tr><td><code>.refetch()</code></td><td>Manually re-run the fetch</td></tr>
              <tr><td><code>.invalidate()</code></td><td>Mark stale + trigger refetch</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Options Form</h2>
          <p>Use an options object for dynamic keys, interceptors, retries, or stale time.</p>
          <code-block lang="ts" code={`@api<Post>({
  fn:  (el) => fetch(\`/api/posts/\${el.postId}\`).then(r => r.json()),
  key: (el) => \`/api/posts/\${el.postId}\`, // re-fetches when key changes
  use: ["auth", "json"],                    // named interceptors
  staleTime: 30_000,                        // ms before data is stale
  retry: 3,                                 // retry count on failure
})
accessor post!: ApiState<Post>;`}></code-block>

          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>fn</code></td><td><code>(el) =&gt; Promise&lt;T&gt;</code></td><td>The fetch function. Receives the host element.</td></tr>
              <tr><td><code>key</code></td><td><code>(el) =&gt; string</code></td><td>Dynamic key — when it changes, abort + refetch.</td></tr>
              <tr><td><code>use</code></td><td><code>string[]</code></td><td>Named interceptors to run before each fetch.</td></tr>
              <tr><td><code>staleTime</code></td><td><code>number</code></td><td>ms before data is considered stale (default: 0).</td></tr>
              <tr><td><code>retry</code></td><td><code>number</code></td><td>Retry count with exponential backoff (default: 0).</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>@intercept — Named Interceptors</h2>
          <p>
            Interceptors follow the same pattern as <span class="ic">@guard</span> on routes:
            define a method, register it by name, reference it in <span class="ic">use: [...]</span>.
            Name defaults to the method name if not provided.
          </p>
          <code-block lang="ts" code={`import { intercept, service, inject } from "@toyz/loom";
import type { ApiCtx } from "@toyz/loom";

@service
class ApiConfig {
  // Name defaults to "auth" (the method name)
  @intercept()
  auth(ctx: ApiCtx, @inject(TokenStore) t: TokenStore) {
    ctx.headers["Authorization"] = \`Bearer \${t.jwt}\`;
  }

  // Explicit name
  @intercept("api")
  setBase(ctx: ApiCtx) {
    ctx.url = "https://api.example.com" + ctx.url;
  }

  @intercept()
  json(ctx: ApiCtx) {
    ctx.headers["Content-Type"] = "application/json";
    ctx.headers["Accept"] = "application/json";
  }

  // Return false to block the request
  @intercept()
  online() {
    return navigator.onLine ? true : false;
  }
}`}></code-block>
        </section>

        <section>
          <h2>ApiCtx</h2>
          <p>The mutable context passed to interceptors. Modify properties directly — no ambiguity.</p>
          <table class="api-table">
            <thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>ctx.url</code></td><td><code>string</code></td><td>Request URL — prepend base URL, add paths</td></tr>
              <tr><td><code>ctx.headers</code></td><td><code>Record&lt;string, string&gt;</code></td><td>Request headers — auth, content type</td></tr>
              <tr><td><code>ctx.params</code></td><td><code>Record&lt;string, string&gt;</code></td><td>Query params — merged as <code>?key=val</code></td></tr>
              <tr><td><code>ctx.init</code></td><td><code>RequestInit</code></td><td>Raw overrides — method, body, credentials</td></tr>
              <tr><td><code>ctx.signal</code></td><td><code>AbortSignal</code></td><td>Auto-managed abort signal (read-only)</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Key Behaviors</h2>
          <table class="api-table">
            <thead><tr><th>Behavior</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td>Stale-While-Revalidate</td><td>During a refetch, old data stays visible. <code>loading</code> is only <code>true</code> when there's no data yet.</td></tr>
              <tr><td>Auto-Abort</td><td>When the key changes or the element disconnects, in-flight requests are automatically aborted via <code>AbortController</code>.</td></tr>
              <tr><td>Retry</td><td>Failed requests retry with exponential backoff: 200ms, 400ms, 800ms...</td></tr>
              <tr><td>Per-Instance State</td><td>Each element instance owns its own fetch lifecycle. For shared data, use a <code>@service</code> + <code>Reactive&lt;T&gt;</code>.</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
