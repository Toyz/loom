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
        <doc-header title="@api — Data Fetching" subtitle="Declarative async data with @api, response pipelines via pipe, and scoped error boundaries with @catch_."></doc-header>

        <section>
          <p>Declarative fetching with the states you actually have to render: loading, error, and loaded. Click through the buttons fast — a superseded response is discarded rather than allowed to overwrite a newer one, which is the failure this decorator exists to prevent.</p>
        </section>

        <doc-section heading="Demo">
          <p>
            This component fetches <span class="ic">/api/team.json</span> using
            the <span class="ic">@api</span> decorator. Use the buttons to
            refetch or invalidate the cache and see the state transitions.
          </p>
          <doc-demo>
            <api-demo></api-demo>
          </doc-demo>
        </doc-section>
        <doc-section heading="What This Shows">
          <ul>
            <li><span class="ic">@api</span> — Accessor decorator that manages the full fetch lifecycle</li>
            <li><span class="ic">pipe</span> — Post-fetch interceptor pipeline for response transformation</li>
            <li><span class="ic">@intercept</span> — Declares named interceptors as class methods</li>
            <li><span class="ic">@catch_("team")</span> — Scoped error boundary for a specific <code>@api</code> accessor</li>
            <li><span class="ic">@catch_</span> — General catch-all for render errors and any unscoped API failures</li>
            <li><span class="ic">.refetch()</span> — Re-runs the fetch; stale-while-revalidate keeps old data visible</li>
            <li><span class="ic">.invalidate()</span> — Marks data as stale and triggers refetch</li>
          </ul>
        </doc-section>
        <doc-section heading="Source">
          <source-block file="docs/src/pages/examples/components/api-demo.tsx"></source-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
