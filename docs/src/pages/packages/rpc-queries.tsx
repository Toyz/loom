/**
 * Packages — @rpc Queries  /packages/rpc-queries
 *
 * @rpc decorator, options, RpcQuery, .match(), reactive args.
 */
import { LoomElement } from "@toyz/loom";

export default class PageRpcQueries extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="@rpc — Queries" subtitle="Reactive queries that fetch on mount, re-run when their arguments change, and cache by key."></doc-header>

        <section>
          <p>A read is not a write. It can be issued speculatively, served from cache, retried without consequence, and deduplicated when three components ask for the same thing in the same tick. Treating reads and writes the same means giving up all of that or hand-rolling it per call site.</p>
          <p><span class="ic">@rpc</span> declares a read. It fetches on mount, caches by key, and revalidates in the background while showing what it already has, so the second visit to a screen is not a loading spinner.</p>
        </section>

        <doc-section heading="Basic Usage">
          <p>
            <span class="ic">@rpc</span> turns an auto-accessor into a reactive query.
            It fetches on connect and re-renders automatically when data arrives.
          </p>
          <code-block lang="ts" code={`import { rpc } from "@toyz/loom-rpc";
import { UserRouter } from "../contracts/user";

@component("user-list")
class UserList extends LoomElement {
  @rpc(UserRouter, "listUsers")
  accessor users!: RpcQuery\<[], User[]\>;

  update() {
    return this.users.match({
      loading: () => \<div\>Loading...\</div\>,
      ok: (users) => \<ul\>{users.map(u => \<li\>{u.name}\</li\>)}\</ul\>,
      err: (e) => \<div\>Error: {e.message}\</div\>,
    });
  }
}`}></code-block>
        </doc-section>
        <doc-section heading="Reactive Arguments">
          <p>
            Pass a <span class="ic">fn</span> to extract procedure arguments from element state.
            When those reactive values change, the query automatically re-fetches.
          </p>
          <code-block lang="ts" code={`@rpc(UserRouter, "getUser", {
  fn: (el): [string] => [el.userId],
})
accessor user!: RpcQuery\<[string], User\>;`}></code-block>
          <p>
            The return type of <span class="ic">fn</span> must match the parameter types of the
            contract method. TypeScript enforces this at compile time.
          </p>
        </doc-section>
        <doc-section heading="Options">
          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>fn</code></td><td>(el) =&gt; Args</td><td><code>[]</code></td><td>Extract procedure args from element state. Re-evaluates on reactive changes.</td></tr>
              <tr><td><code>staleTime</code></td><td>number</td><td><code>0</code></td><td>ms before <code>.stale</code> flips to true and a background revalidation goes out.</td></tr>
              <tr><td><code>revalidate</code></td><td>boolean</td><td><code>true</code></td><td>Whether staleness triggers that refetch. False keeps <code>.stale</code> advisory.</td></tr>
              <tr><td><code>eager</code></td><td>boolean</td><td><code>true</code></td><td>Whether to fetch immediately on connect. Set to <code>false</code> for on-demand queries.</td></tr>
              <tr><td><code>retry</code></td><td>number</td><td><code>0</code></td><td>Number of retries on failure with exponential backoff (200ms, 400ms, 800ms...).</td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-section heading="Staleness">
          <p>
            <span class="ic">staleTime</span> is how long data is considered fresh. Once it
            has elapsed, the next read flips <span class="ic">.stale</span> to{" "}
            <span class="ic">true</span> and the cached data stays visible.
          </p>
          <p>
            Then it revalidates in the background, the same as{" "}
            <span class="ic">@api</span> and <span class="ic">@fetch</span> — cached data stays
            on screen while the new request is in flight. Set{" "}
            <span class="ic">revalidate: false</span> to keep <span class="ic">.stale</span>{" "}
            purely advisory: the flag still flips and an{" "}
            <span class="ic">ApiStale</span> still goes out on the bus, but nothing refetches
            until the arguments change or you call <span class="ic">.refetch()</span> or{" "}
            <span class="ic">.invalidate()</span>.
          </p>
          <p class="note">
            The stale transition is announced on the bus as{" "}
            <span class="ic">ApiStale</span>, with <span class="ic">name</span> set to{" "}
            <span class="ic">"Router.method"</span> and <span class="ic">key</span> to the
            serialised arguments — so a toolbar indicator or a cache layer can react without a
            reference to the component.
          </p>
          <code-block lang="ts" code={`@rpc(UserRouter, "listUsers", {
  staleTime: 60_000,  // cache for 1 minute
  retry: 2,           // retry twice on failure
})
accessor users!: RpcQuery\<[number, number], User[]\>;`}></code-block>
        </doc-section>
        <doc-section heading="RpcQuery&lt;TArgs, TReturn&gt;">
          <p>
            Every <span class="ic">@rpc</span> accessor is an <span class="ic">RpcQuery&lt;TArgs, TReturn&gt;</span> — a typed, reactive state container with pattern matching and Result combinators.{" "}
            <span class="ic">ApiState&lt;T&gt;</span> is also accepted for backwards compatibility.
          </p>
          <table class="api-table">
            <thead><tr><th>Property / Method</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>.ok</code></td><td>True if data exists and no error</td></tr>
              <tr><td><code>.data</code></td><td>The resolved data, or <code>undefined</code></td></tr>
              <tr><td><code>.error</code></td><td>The error from the last fetch, or <code>undefined</code></td></tr>
              <tr><td><code>.loading</code></td><td>True during fetch (false if cached data exists — SWR)</td></tr>
              <tr><td><code>.stale</code></td><td>True when <code>staleTime</code> has elapsed. Reading it starts the revalidation.</td></tr>
              <tr><td><code>.refetch()</code></td><td>Force re-execute the query</td></tr>
              <tr><td><code>.invalidate()</code></td><td>Mark stale and trigger refetch</td></tr>
              <tr><td><code>.unwrap()</code></td><td>Return data or throw the error</td></tr>
              <tr><td><code>.unwrap_or(fallback)</code></td><td>Return data or the fallback value</td></tr>
              <tr><td><code>.match(cases)</code></td><td>Exhaustive pattern match — <code>loading</code>, <code>ok</code>, <code>err</code></td></tr>
              <tr><td><code>.map(fn)</code></td><td>Transform the Ok value into a <code>LoomResult</code></td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-section heading="Pattern Matching">
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
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
