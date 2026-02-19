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
          <h2>Demo</h2>
          <p class="hint" style="margin-bottom:0.75rem;color:var(--text-muted);font-size:0.85rem;">
            Move your mouse over the canvas to control the paddle. Click to start.
          </p>
          <canvas-game-demo></canvas-game-demo>
        </section>

        <section>
          <h2>What This Shows</h2>
          <ul>
            <li><span class="ic">&lt;loom-canvas&gt;</span> — Auto-resizing canvas with DPR-aware rendering</li>
            <li><span class="ic">draw</span> — Per-frame draw callback with delta-time for smooth animation</li>
            <li><span class="ic">@reactive</span> — Score and lives update the HUD without re-rendering the canvas</li>
            <li><span class="ic">loom-keep</span> — Canvas element is preserved across morphs (baked into loom-canvas)</li>
            <li><span class="ic">@mount</span> — One-time setup for input handlers</li>
          </ul>
        </section>

        <section>
          <h2>Source</h2>
          <code-block lang="ts" code={SOURCE}></code-block>
        </section>
      </div>
    );
  }
}

const SOURCE = `import { LoomElement, component, reactive, css, styles, mount } from "@toyz/loom";
import "@toyz/loom/element/canvas";

const sheet = css\`
  .game-wrapper { display: flex; flex-direction: column; gap: 1rem; align-items: center; }
  .canvas-container {
    width: 100%; max-width: 600px; aspect-ratio: 3/2;
    border-radius: 12px; overflow: hidden;
    border: 1px solid var(--border); background: #0a0a14; cursor: none;
  }
  loom-canvas { width: 100%; height: 100%; }
\`;

@component("breakout-game")
@styles(sheet)
class BreakoutGame extends LoomElement {
  @reactive accessor score = 0;
  @reactive accessor lives = 3;

  private paddleX = 0;
  private ballX = 0; private ballY = 0;
  private ballDX = 0; private ballDY = -300;
  private bricks: { x: number; y: number; w: number; h: number; alive: boolean }[] = [];

  @mount init() {
    this.buildBricks();
    this.resetBall();
    this.shadow.querySelector(".canvas-container")!
      .addEventListener("mousemove", (e: MouseEvent) => {
        const rect = (e.target as Element).getBoundingClientRect();
        this.paddleX = ((e.clientX - rect.left) / rect.width) * 600;
      });
  }

  buildBricks() { /* create 10×5 grid of bricks */ }
  resetBall()   { /* center ball, random upward angle */ }

  draw = (ctx: CanvasRenderingContext2D, dt: number) => {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Draw bricks, paddle, ball...
    // Update physics: wall bounce, paddle bounce, brick collision
    // Decrement lives on bottom edge, check win condition

    this.score += 10; // on brick hit
  };

  update() {
    return (
      <div class="game-wrapper">
        <div class="hud">Score: {this.score} | Lives: {this.lives}</div>
        <div class="canvas-container">
          <loom-canvas draw={this.draw} />
        </div>
        <button onClick={() => this.resetGame()}>New Game</button>
      </div>
    );
  }
}`;
