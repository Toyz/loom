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
        <h1>Stress Test</h1>
        <p class="subtitle">
          Traced Template Projection in action — a <span class="ic">@interval(16)</span> ticks
          at 60fps while <span class="ic">@computed</span> derives stats and{" "}
          <span class="ic">@watch</span> reacts to changes.
        </p>

        <section>
          <h2>Demo</h2>
          <p>
            Click any cell to make it the <strong>hot cell</strong>. Only the
            hot cell's value ticks at 60fps via <span class="ic">@interval</span>. Watch
            the render counter to see how the framework handles rapid state changes.
          </p>
          <stress-test></stress-test>
        </section>

        <section>
          <h2>Loom Decorators Used</h2>
          <ul>
            <li><span class="ic">@component("stress-test")</span> — registers the custom element</li>
            <li><span class="ic">@styles(sheet)</span> — scoped CSS via adopted stylesheet</li>
            <li><span class="ic">@reactive</span> — observable state: cells, hotCell, ticks, renderCount</li>
            <li><span class="ic">@computed</span> — derived values: hotValue, skippedRenders, skipRate (cached until deps dirty)</li>
            <li><span class="ic">@interval(16)</span> — auto-cleaned 60fps tick, zero manual setInterval</li>
            <li><span class="ic">@mount</span> / <span class="ic">@unmount</span> — lifecycle hooks</li>
            <li><span class="ic">@watch("hotCell")</span> — resets old cell when hot index changes</li>
          </ul>
        </section>

        <section>
          <h2>Traced Template Projection</h2>
          <ol>
            <li><span class="ic">startTrace()</span> wraps <span class="ic">update()</span> and records every <span class="ic">Reactive.value</span> read</li>
            <li>The dependency set is stored as <span class="ic">__traceDeps</span></li>
            <li>On subsequent <span class="ic">scheduleUpdate()</span> calls, <span class="ic">hasDirtyDeps()</span> checks if any dependency changed</li>
            <li>If clean → skip the entire render pipeline. No update(), no JSX, no morph</li>
          </ol>
        </section>

        <section>
          <h2>Source</h2>
          <source-block file="docs/src/pages/examples/components/stress-test.tsx"></source-block>
        </section>
      </div>
    );
  }
}
