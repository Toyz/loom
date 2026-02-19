/**
 * Example — @api Data Fetching
 *
 * Live demo: @api decorator, pipe interceptors, @catch_ error boundaries
 */
import { LoomElement } from "@toyz/loom";
import "./components/api-demo";

export default class ExampleApi extends LoomElement {
  update() {
    return (
      <div>
        <h1>@api — Data Fetching</h1>
        <p class="subtitle">
          Declarative async data with <span class="ic">@api</span>, response
          pipelines via <span class="ic">pipe</span>, and scoped error
          boundaries with <span class="ic">@catch_</span>.
        </p>

        <section>
          <h2>Demo</h2>
          <p>
            This component fetches <span class="ic">/api/team.json</span> using
            the <span class="ic">@api</span> decorator. Use the buttons to
            refetch or invalidate the cache and see the state transitions.
          </p>
          <api-demo></api-demo>
        </section>

        <section>
          <h2>What This Shows</h2>
          <ul>
            <li><span class="ic">@api</span> — Accessor decorator that manages the full fetch lifecycle</li>
            <li><span class="ic">pipe</span> — Post-fetch interceptor pipeline for response transformation</li>
            <li><span class="ic">@intercept</span> — Declares named interceptors as class methods</li>
            <li><span class="ic">@catch_("team")</span> — Scoped error boundary for a specific <code>@api</code> accessor</li>
            <li><span class="ic">@catch_</span> — General catch-all for render errors and any unscoped API failures</li>
            <li><span class="ic">.refetch()</span> — Re-runs the fetch; stale-while-revalidate keeps old data visible</li>
            <li><span class="ic">.invalidate()</span> — Marks data as stale and triggers refetch</li>
          </ul>
        </section>

        <section>
          <h2>Source</h2>
          <source-block file="docs/src/pages/examples/components/api-demo.tsx"></source-block>
        </section>
      </div>
    );
  }
}
