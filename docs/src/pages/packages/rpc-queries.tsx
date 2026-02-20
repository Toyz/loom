/**
 * Packages — @rpc Queries  /packages/rpc-queries
 *
 * @rpc decorator, options, ApiState, .match(), reactive args.
 */
import { LoomElement } from "@toyz/loom";

export default class PageRpcQueries extends LoomElement {
  update() {
    return (
      <div>
        <h1>@rpc — Queries</h1>
        <p class="subtitle">Auto-fetching, reactive queries with SWR caching and pattern matching.</p>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20}></loom-icon>
            <h2>Basic Usage</h2>
          </div>
          <p>
            <span class="ic">@rpc</span> turns an auto-accessor into a reactive query.
            It fetches on connect and re-renders automatically when data arrives.
          </p>
          <code-block lang="ts" code={`import { rpc } from "@toyz/loom-rpc";
import { UserRouter } from "../contracts/user";

@component("user-list")
class UserList extends LoomElement {
  @rpc(UserRouter, "listUsers")
  accessor users!: ApiState\<User[]\>;

  update() {
    return this.users.match({
      loading: () => \<div\>Loading...\</div\>,
      ok: (users) => \<ul\>{users.map(u => \<li\>{u.name}\</li\>)}\</ul\>,
      err: (e) => \<div\>Error: {e.message}\</div\>,
    });
  }
}`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20}></loom-icon>
            <h2>Reactive Arguments</h2>
          </div>
          <p>
            Pass a <span class="ic">fn</span> to extract procedure arguments from element state.
            When those reactive values change, the query automatically re-fetches.
          </p>
          <code-block lang="ts" code={`@rpc(UserRouter, "getUser", {
  fn: (el): [string] => [el.userId],
})
accessor user!: ApiState\<User\>;`}></code-block>
          <p>
            The return type of <span class="ic">fn</span> must match the parameter types of the
            contract method. TypeScript enforces this at compile time.
          </p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20}></loom-icon>
            <h2>Options</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>fn</code></td><td>(el) =&gt; Args</td><td><code>[]</code></td><td>Extract procedure args from element state. Re-evaluates on reactive changes.</td></tr>
              <tr><td><code>staleTime</code></td><td>number</td><td><code>0</code></td><td>SWR cache duration in ms. After this time, data is marked stale.</td></tr>
              <tr><td><code>eager</code></td><td>boolean</td><td><code>true</code></td><td>Whether to fetch immediately on connect. Set to <code>false</code> for on-demand queries.</td></tr>
              <tr><td><code>retry</code></td><td>number</td><td><code>0</code></td><td>Number of retries on failure with exponential backoff (200ms, 400ms, 800ms...).</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="refresh" size={20}></loom-icon>
            <h2>SWR Caching</h2>
          </div>
          <p>
            Set <span class="ic">staleTime</span> to enable stale-while-revalidate caching.
            After <span class="ic">staleTime</span> milliseconds, the next read marks data
            as stale and triggers a background refetch — the old data remains visible until
            the new data arrives.
          </p>
          <code-block lang="ts" code={`@rpc(UserRouter, "listUsers", {
  staleTime: 60_000,  // cache for 1 minute
  retry: 2,           // retry twice on failure
})
accessor users!: ApiState\<User[]\>;`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20}></loom-icon>
            <h2>ApiState&lt;T&gt;</h2>
          </div>
          <p>
            Every <span class="ic">@rpc</span> accessor is an <span class="ic">ApiState&lt;T&gt;</span>{" "}
            — a reactive state container with pattern matching and Result combinators.
          </p>
          <table class="api-table">
            <thead><tr><th>Property / Method</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>.ok</code></td><td>True if data exists and no error</td></tr>
              <tr><td><code>.data</code></td><td>The resolved data, or <code>undefined</code></td></tr>
              <tr><td><code>.error</code></td><td>The error from the last fetch, or <code>undefined</code></td></tr>
              <tr><td><code>.loading</code></td><td>True during fetch (false if cached data exists — SWR)</td></tr>
              <tr><td><code>.stale</code></td><td>True when <code>staleTime</code> has elapsed</td></tr>
              <tr><td><code>.refetch()</code></td><td>Force re-execute the query</td></tr>
              <tr><td><code>.invalidate()</code></td><td>Mark stale and trigger refetch</td></tr>
              <tr><td><code>.unwrap()</code></td><td>Return data or throw the error</td></tr>
              <tr><td><code>.unwrap_or(fallback)</code></td><td>Return data or the fallback value</td></tr>
              <tr><td><code>.match(cases)</code></td><td>Exhaustive pattern match — <code>loading</code>, <code>ok</code>, <code>err</code></td></tr>
              <tr><td><code>.map(fn)</code></td><td>Transform the Ok value into a <code>LoomResult</code></td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20}></loom-icon>
            <h2>Pattern Matching</h2>
          </div>
          <p>
            <span class="ic">.match()</span> handles all three states — loading, success, and error.
            The <span class="ic">loading</span> branch is optional; if omitted, loading falls through to <span class="ic">err</span>.
          </p>
          <code-block lang="tsx" code={`update() {
  return this.users.match({
    loading: () => this.renderSkeletons(4),
    ok: (users) => users.map(u => (
      \<div class="user-card"\>{u.name}\</div\>
    )),
    err: (e) => \<div class="error"\>{e.message}\</div\>,
  });
}`}></code-block>
        </section>
      </div>
    );
  }
}
