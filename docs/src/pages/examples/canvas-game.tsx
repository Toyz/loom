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
        <doc-header title="Canvas Game" subtitle="A playable breakout clone built with <loom-canvas>, @animationFrame, and @reactive."></doc-header>

        <section>
          <p>A playable breakout clone in one component. Physics and paint are separate <span class="ic">@animationFrame</span> layers so the simulation always finishes before anything draws, and both share the one render loop the rest of the page is using.</p>
        </section>

        <doc-section heading="Demo">
          <doc-demo note="Move your mouse over the canvas to control the paddle. Click to start.">
            <canvas-game-demo></canvas-game-demo>
          </doc-demo>
        </doc-section>
        <doc-section heading="What This Shows">
          <ul>
            <li><span class="ic">&lt;loom-canvas&gt;</span> — Auto-resizing canvas with DPR-aware rendering</li>
            <li><span class="ic">draw</span> — Per-frame draw callback with delta-time for smooth animation</li>
            <li><span class="ic">@reactive</span> — Score and lives update the HUD without re-rendering the canvas</li>
            <li><span class="ic">loom-keep</span> — Canvas element is preserved across morphs (baked into loom-canvas)</li>
            <li><span class="ic">@mount</span> — One-time setup for input handlers</li>
          </ul>
        </doc-section>
        <doc-section heading="Source">
          <source-block file="docs/src/pages/examples/components/canvas-game-demo.tsx"></source-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
