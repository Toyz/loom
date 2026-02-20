/**
 * Timing — /element/timing
 *
 * @interval, @timeout, @debounce, @throttle, @animationFrame
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementTiming extends LoomElement {
  update() {
    return (
      <div>
        <h1>Timing</h1>
        <p class="subtitle">Auto-cleaned timer and animation frame decorators.</p>

        <section>
          <div class="group-header">
            <loom-icon name="clock" size={20} color="var(--emerald)"></loom-icon>
            <h2>@interval</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@interval(ms)</div>
            <div class="dec-desc">
              Auto-cleaned <span class="ic">setInterval</span>. Runs every <span class="ic">ms</span> milliseconds on connect, cleared on disconnect.
            </div>
            <code-block lang="ts" code={`@interval(1000)
tick() {
  this.elapsed++;
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="clock" size={20} color="var(--accent)"></loom-icon>
            <h2>@timeout</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@timeout(ms)</div>
            <div class="dec-desc">
              Auto-cleaned <span class="ic">setTimeout</span>. Runs once after <span class="ic">ms</span> on connect, cleared on disconnect.
            </div>
            <code-block lang="ts" code={`@timeout(3000)
hideWelcome() {
  this.$(".welcome")?.remove();
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--amber)"></loom-icon>
            <h2>@debounce</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@debounce(ms)</div>
            <div class="dec-desc">
              Debounces a method — delays execution until <span class="ic">ms</span> after
              the last call. Timer auto-cleaned on disconnect.
            </div>
            <code-block lang="ts" code={`@debounce(300)
onSearchInput(query: string) {
  this.fetchResults(query);
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--cyan)"></loom-icon>
            <h2>@throttle</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@throttle(ms)</div>
            <div class="dec-desc">
              Throttles a method — executes immediately then ignores calls
              for <span class="ic">ms</span>. Timer auto-cleaned on disconnect.
            </div>
            <code-block lang="ts" code={`@throttle(100)
onScroll() {
  this.updateVisibleRange();
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--rose)"></loom-icon>
            <h2>@animationFrame</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@animationFrame(layer?)</div>
            <div class="dec-desc">
              Centralized <span class="ic">requestAnimationFrame</span> loop via <span class="ic">RenderLoop</span>.
              Method receives <span class="ic">(dt, timestamp)</span>. Lower layers run first.
            </div>
            <code-block lang="ts" code={`@animationFrame(0)   // physics first
physics(dt: number) {
  this.velocity += this.gravity * dt;
}

@animationFrame(10)  // rendering after physics
draw(dt: number) {
  this.ctx.clearRect(0, 0, this.w, this.h);
  this.ctx.fillRect(this.x, this.y, 10, 10);
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--accent)"></loom-icon>
            <h2>Overview</h2>
          </div>
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
          <div class="note">
            All timing decorators are built on <span class="ic">createDecorator</span> and automatically
            clean up when the element disconnects from the DOM — no manual teardown needed.
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--amber)"></loom-icon>
            <h2>Architecture: The Render Loop</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              All <span class="ic">@animationFrame</span> callbacks are managed by a single,
              centralized <span class="ic">RenderLoop</span> instance. This means multiple components
              using <span class="ic">@animationFrame</span> share one <span class="ic">requestAnimationFrame</span>{" "}
              loop — no duplicate frame requests, no wasted cycles. Layers control execution order
              (lower layers run first), making it easy to separate physics from rendering.
            </div>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="search" size={20} color="var(--emerald)"></loom-icon>
            <h2>Example: Search As You Type</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Combine <span class="ic">@debounce</span> with <span class="ic">@reactive</span> for
              efficient search input handling:
            </div>
            <code-block lang="ts" code={`@component("live-search")
class LiveSearch extends LoomElement {
  @reactive accessor results: SearchResult[] = [];
  @reactive accessor query = "";
  @reactive accessor loading = false;

  onInput(e: Event) {
    this.query = (e.target as HTMLInputElement).value;
    this.search(this.query);
  }

  @debounce(300)
  async search(q: string) {
    if (!q.trim()) { this.results = []; return; }
    this.loading = true;
    const res = await fetch(\`/api/search?q=\${encodeURIComponent(q)}\`);
    this.results = await res.json();
    this.loading = false;
  }

  update() {
    return (
      <div>
        <input value={this.query} onInput={e => this.onInput(e)}
               placeholder="Search..." />
        {this.loading && <div class="spinner" />}
        <ul>
          {this.results.map(r => <li>{r.title}</li>)}
        </ul>
      </div>
    );
  }
}`}></code-block>
          </div>
        </section>
      </div>
    );
  }
}
