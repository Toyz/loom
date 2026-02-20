/**
 * Example — Canvas Game
 *
 * Live demo: <loom-canvas>, @animationFrame, @reactive, @mount
 */
import { LoomElement } from "@toyz/loom";
import "./components/canvas-game-demo";

export default class ExampleCanvasGame extends LoomElement {
  update() {
    return (
      <div>
        <h1>Canvas Game</h1>
        <p class="subtitle">
          A playable breakout clone built with{" "}
          <span class="ic">&lt;loom-canvas&gt;</span>,{" "}
          <span class="ic">@animationFrame</span>, and{" "}
          <span class="ic">@reactive</span>.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20}></loom-icon>
            <h2>Demo</h2>
          </div>
          <p class="hint" style="margin-bottom:0.75rem;color:var(--text-muted);font-size:0.85rem;">
            Move your mouse over the canvas to control the paddle. Click to start.
          </p>
          <canvas-game-demo></canvas-game-demo>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20}></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">&lt;loom-canvas&gt;</span> — Auto-resizing canvas with DPR-aware rendering</li>
            <li><span class="ic">draw</span> — Per-frame draw callback with delta-time for smooth animation</li>
            <li><span class="ic">@reactive</span> — Score and lives update the HUD without re-rendering the canvas</li>
            <li><span class="ic">loom-keep</span> — Canvas element is preserved across morphs (baked into loom-canvas)</li>
            <li><span class="ic">@mount</span> — One-time setup for input handlers</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20}></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/canvas-game-demo.tsx"></source-block>
        </section>
      </div>
    );
  }
}
