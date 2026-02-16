/**
 * Timing — /element/timing
 *
 * @interval, @timeout, @debounce, @throttle, @animationFrame
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";
import { ElementGroup } from "../../groups";

@route("/timing", { group: ElementGroup })
@component("page-element-timing")
export class PageElementTiming extends LoomElement {
  update() {
    return (
      <div>
        <h1>Timing</h1>
        <p class="subtitle">Auto-cleaned timer and animation frame decorators.</p>

        <section>
          <h2>@interval(ms)</h2>
          <p>
            Auto-cleaned <span class="ic">setInterval</span>. Runs every <span class="ic">ms</span> milliseconds on connect, cleared on disconnect.
          </p>
          <code-block lang="ts" code={`@interval(1000)
tick() {
  this.elapsed++;
}`}></code-block>
        </section>

        <section>
          <h2>@timeout(ms)</h2>
          <p>
            Auto-cleaned <span class="ic">setTimeout</span>. Runs once after <span class="ic">ms</span> on connect, cleared on disconnect.
          </p>
          <code-block lang="ts" code={`@timeout(3000)
hideWelcome() {
  this.$(".welcome")?.remove();
}`}></code-block>
        </section>

        <section>
          <h2>@debounce(ms)</h2>
          <p>
            Debounces a method — delays execution until <span class="ic">ms</span> after
            the last call. Timer auto-cleaned on disconnect.
          </p>
          <code-block lang="ts" code={`@debounce(300)
onSearchInput(query: string) {
  this.fetchResults(query);
}`}></code-block>
        </section>

        <section>
          <h2>@throttle(ms)</h2>
          <p>
            Throttles a method — executes immediately then ignores calls
            for <span class="ic">ms</span>. Timer auto-cleaned on disconnect.
          </p>
          <code-block lang="ts" code={`@throttle(100)
onScroll() {
  this.updateVisibleRange();
}`}></code-block>
        </section>

        <section>
          <h2>@animationFrame(layer?)</h2>
          <p>
            Centralized <span class="ic">requestAnimationFrame</span> loop via <span class="ic">RenderLoop</span>.
            Method receives <span class="ic">(dt, timestamp)</span>. Lower layers run first.
          </p>
          <code-block lang="ts" code={`@animationFrame(0)   // physics first
physics(dt: number) {
  this.velocity += this.gravity * dt;
}

@animationFrame(10)  // rendering after physics
draw(dt: number) {
  this.ctx.clearRect(0, 0, this.w, this.h);
  this.ctx.fillRect(this.x, this.y, 10, 10);
}`}></code-block>
        </section>

        <section>
          <h2>Overview</h2>
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Behavior</th><th>Cleanup</th></tr></thead>
            <tbody>
              <tr><td><code>@interval(ms)</code></td><td>Repeating timer</td><td>clearInterval on disconnect</td></tr>
              <tr><td><code>@timeout(ms)</code></td><td>One-shot timer</td><td>clearTimeout on disconnect</td></tr>
              <tr><td><code>@debounce(ms)</code></td><td>Delay until idle</td><td>clearTimeout on disconnect</td></tr>
              <tr><td><code>@throttle(ms)</code></td><td>Rate-limit calls</td><td>clearTimeout on disconnect</td></tr>
              <tr><td><code>@animationFrame(n)</code></td><td>rAF loop, layer-ordered</td><td>Unregistered on disconnect</td></tr>
            </tbody>
          </table>
          <p>
            All timing decorators are built on <span class="ic">createDecorator</span> and automatically
            clean up when the element disconnects from the DOM — no manual teardown needed.
          </p>
        </section>
      </div>
    );
  }
}
