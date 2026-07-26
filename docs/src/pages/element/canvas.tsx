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
        <doc-header title="&lt;loom-canvas&gt;" subtitle="DPR-correct sizing and a draw callback on the shared render loop."></doc-header>

        <section>
          <p>Getting a canvas correct on a modern display is more work than it looks: size the backing store to <span class="ic">devicePixelRatio</span>, scale the context to match, redo both on every resize, and drive the draw from a frame loop you remember to cancel. Skip the DPR step and everything you draw is blurry on every laptop made in the last decade.</p>
          <p><span class="ic">loom-canvas</span> does the sizing and rescaling, and calls your draw method from Loom's shared render loop — the same one <span class="ic">@animationFrame</span> uses, so a canvas and the components around it stay on one <span class="ic">requestAnimationFrame</span> rather than competing for frames.</p>
        </section>

        <doc-section heading="Quick Start">
          <code-block lang="ts" code={QUICK_START}></code-block>
        </doc-section>
        <doc-section heading="Props">
          <api-table
            head={["Prop", "Type", "Default", "Description"]}
            rows={[
              [<span class="ic">autoResize</span>, "boolean", <span class="ic">true</span>, "Match canvas dimensions to host element via ResizeObserver"],
              [<span class="ic">width</span>, "number", "0", "Fixed width in CSS pixels (only used when autoResize is false)"],
              [<span class="ic">height</span>, "number", "0", "Fixed height in CSS pixels (only used when autoResize is false)"],
              [<span class="ic">draw</span>, "(ctx, dt, t) =&gt; void", "null", "Called every frame with the 2D context, delta time (s), and timestamp"],
            ]}
          ></api-table>
        </doc-section>
        <doc-section heading="API">
          <api-table
            head={["Member", "Type", "Description"]}
            rows={[
              [<span class="ic">ctx</span>, "CanvasRenderingContext2D", "Cached 2D rendering context"],
              [<span class="ic">canvas</span>, "HTMLCanvasElement", "Reference to the raw &lt;canvas&gt; element"],
              [<span class="ic">clear()</span>, "void", "Convenience to clear the full canvas"],
            ]}
          ></api-table>
        </doc-section>
        <doc-section heading="How It Works">
          <ul>
            <li>The inner <span class="ic">&lt;canvas&gt;</span> is created with <span class="ic">loom-keep</span> — morphing never touches it</li>
            <li><span class="ic">@animationFrame</span> drives the draw loop via Loom's centralized <span class="ic">RenderLoop</span></li>
            <li>When <span class="ic">autoResize</span> is enabled, a <span class="ic">ResizeObserver</span> updates the canvas dimensions and scales for <span class="ic">devicePixelRatio</span> — crisp rendering on retina displays</li>
            <li><span class="ic">shouldUpdate()</span> blocks re-morphing after the initial skeleton is built — the canvas is fully imperative</li>
          </ul>
        </doc-section>
        <doc-section heading="Fixed Size">
            <p>For pixel-perfect rendering (e.g. games), disable auto-resize and set explicit dimensions:</p>
            <code-block lang="ts" code={FIXED_SIZE}></code-block>
        </doc-section>
        <doc-section heading="Imperative Access">
            <p>
              You can also grab a reference via <span class="ic">@query</span> and draw
              directly outside the render loop:
            </p>
            <code-block lang="ts" code={IMPERATIVE}></code-block>
        </doc-section>
        <doc-nav></doc-nav>
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
