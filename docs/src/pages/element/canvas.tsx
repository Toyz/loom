/**
 * Docs — Canvas Element
 *
 * Reference page for <loom-canvas> — auto-resizing canvas with
 * per-frame draw callbacks via Loom's RenderLoop.
 */
import { LoomElement } from "@toyz/loom";

export default class PageCanvas extends LoomElement {
  update() {
    return (
      <div>
        <h1>&lt;loom-canvas&gt;</h1>
        <p class="subtitle">
          A built-in canvas web component with auto-resize, DPR-aware scaling,
          and per-frame draw callbacks via Loom's <span class="ic">RenderLoop</span>.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Quick Start</h2>
          </div>
          <code-block lang="ts" code={QUICK_START}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--accent)"></loom-icon>
            <h2>Props</h2>
          </div>
          <table class="api-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="ic">autoResize</span></td>
                <td>boolean</td>
                <td><span class="ic">true</span></td>
                <td>Match canvas dimensions to host element via ResizeObserver</td>
              </tr>
              <tr>
                <td><span class="ic">width</span></td>
                <td>number</td>
                <td>0</td>
                <td>Fixed width in CSS pixels (only used when autoResize is false)</td>
              </tr>
              <tr>
                <td><span class="ic">height</span></td>
                <td>number</td>
                <td>0</td>
                <td>Fixed height in CSS pixels (only used when autoResize is false)</td>
              </tr>
              <tr>
                <td><span class="ic">draw</span></td>
                <td>(ctx, dt, t) =&gt; void</td>
                <td>null</td>
                <td>Called every frame with the 2D context, delta time (s), and timestamp</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--cyan)"></loom-icon>
            <h2>API</h2>
          </div>
          <table class="api-table">
            <thead>
              <tr><th>Member</th><th>Type</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><span class="ic">ctx</span></td>
                <td>CanvasRenderingContext2D</td>
                <td>Cached 2D rendering context</td>
              </tr>
              <tr>
                <td><span class="ic">canvas</span></td>
                <td>HTMLCanvasElement</td>
                <td>Reference to the raw &lt;canvas&gt; element</td>
              </tr>
              <tr>
                <td><span class="ic">clear()</span></td>
                <td>void</td>
                <td>Convenience to clear the full canvas</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--amber)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <ul>
            <li>The inner <span class="ic">&lt;canvas&gt;</span> is created with <span class="ic">loom-keep</span> — morphing never touches it</li>
            <li><span class="ic">@animationFrame</span> drives the draw loop via Loom's centralized <span class="ic">RenderLoop</span></li>
            <li>When <span class="ic">autoResize</span> is enabled, a <span class="ic">ResizeObserver</span> updates the canvas dimensions and scales for <span class="ic">devicePixelRatio</span> — crisp rendering on retina displays</li>
            <li><span class="ic">shouldUpdate()</span> blocks re-morphing after the initial skeleton is built — the canvas is fully imperative</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="box" size={20} color="var(--accent)"></loom-icon>
            <h2>Fixed Size</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">For pixel-perfect rendering (e.g. games), disable auto-resize and set explicit dimensions:</div>
            <code-block lang="ts" code={FIXED_SIZE}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--rose)"></loom-icon>
            <h2>Imperative Access</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              You can also grab a reference via <span class="ic">@query</span> and draw
              directly outside the render loop:
            </div>
            <code-block lang="ts" code={IMPERATIVE}></code-block>
          </div>
        </section>
      </div>
    );
  }
}

const QUICK_START = `import { LoomElement, component } from "@toyz/loom";
import "@toyz/loom/element/canvas";

@component("my-viz")
class MyViz extends LoomElement {
  draw = (ctx: CanvasRenderingContext2D, dt: number, t: number) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const x = Math.sin(t / 1000) * 100 + ctx.canvas.width / 2;
    ctx.fillStyle = "#818cf8";
    ctx.beginPath();
    ctx.arc(x, ctx.canvas.height / 2, 20, 0, Math.PI * 2);
    ctx.fill();
  };

  update() {
    return <loom-canvas draw={this.draw} />;
  }
}`;

const FIXED_SIZE = `<loom-canvas
  autoResize={false}
  width={800}
  height={600}
  draw={this.draw}
/>`;

const IMPERATIVE = `import { LoomElement, component, query, mount } from "@toyz/loom";
import "@toyz/loom/element/canvas";
import type { LoomCanvas } from "@toyz/loom/element/canvas";

@component("my-chart")
class MyChart extends LoomElement {
  @query("loom-canvas") canvas!: LoomCanvas;

  @mount
  drawChart() {
    const ctx = this.canvas.ctx;
    // Draw directly — useful for one-shot renders
    ctx.fillStyle = "#34d399";
    ctx.fillRect(10, 10, 200, 100);
  }

  update() {
    return <loom-canvas autoResize={false} width={400} height={300} />;
  }
}`;
