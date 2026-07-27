/**
 * Example — Stress Test
 *
 * Live demo: Traced Template Projection, @interval, @computed, @watch, @mount/@unmount
 */
import { LoomElement } from "@toyz/loom";
import "./components/stress-test";

export default class ExampleStressTest extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Stress Test" subtitle="Traced Template Projection in action — a @interval(16) ticks at 60fps while @computed derives stats and @watch reacts to changes."></doc-header>

        <section>
          <p>A thousand cells updated on a 16ms tick, to show what the three-tier update actually costs. Most ticks change one cell, and the other 999 components resolve to a skip because nothing they read changed — that is the tier the framework is built around.</p>
        </section>

        <doc-section heading="Demo">
          <p>
            Click any cell to make it the <strong>hot cell</strong>. Only the
            hot cell's value ticks at 60fps via <span class="ic">@interval</span>. Watch
            the render counter to see how the framework handles rapid state changes.
          </p>
          <doc-demo>
            <stress-test></stress-test>
          </doc-demo>
        </doc-section>
        <doc-section heading="Loom Decorators Used">
          <ul>
            <li><span class="ic">@component("stress-test")</span> — registers the custom element</li>
            <li><span class="ic">@styles(sheet)</span> — scoped CSS via adopted stylesheet</li>
            <li><span class="ic">@reactive</span> — observable state: cells, hotCell, ticks, renderCount</li>
            <li><span class="ic">@computed</span> — derived values: hotValue, skippedRenders, skipRate (cached until deps dirty)</li>
            <li><span class="ic">@interval(16)</span> — auto-cleaned 60fps tick, zero manual setInterval</li>
            <li><span class="ic">@mount</span> / <span class="ic">@unmount</span> — lifecycle hooks</li>
            <li><span class="ic">@watch("hotCell")</span> — resets old cell when hot index changes</li>
          </ul>
        </doc-section>
        <doc-section heading="Traced Template Projection">
          <ol>
            <li><span class="ic">startTrace()</span> wraps <span class="ic">update()</span> and records every <span class="ic">Reactive.value</span> read</li>
            <li>The dependency set is stored as <span class="ic">__traceDeps</span></li>
            <li>On subsequent <span class="ic">scheduleUpdate()</span> calls, <span class="ic">hasDirtyDeps()</span> checks if any dependency changed</li>
            <li>If clean → skip the entire render pipeline. No update(), no JSX, no morph</li>
          </ol>
        </doc-section>
        <doc-section heading="Source">
          <source-block file="docs/src/pages/examples/components/stress-test.tsx"></source-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
