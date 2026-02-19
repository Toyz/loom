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
import type { DrawCallback } from "@toyz/loom/element/canvas";

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

  private paddleX = 300;
  private ball = { x: 300, y: 250, dx: 200, dy: -300 };
  private bricks: { x: number; y: number; alive: boolean }[] = [];
  private running = false;

  @mount init() {
    // Build a 10×4 grid of bricks
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 10; col++)
        this.bricks.push({ x: 20 + col * 56, y: 30 + row * 24, alive: true });
  }

  draw: DrawCallback = (ctx, dt) => {
    const W = 600, H = 400;
    ctx.clearRect(0, 0, W, H);

    // Bricks
    for (const b of this.bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = "#f472b6";
      ctx.fillRect(b.x, b.y, 50, 18);
    }

    // Paddle
    ctx.fillStyle = "#818cf8";
    ctx.fillRect(this.paddleX - 40, H - 20, 80, 10);

    // Ball
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#34d399";
    ctx.fill();

    if (!this.running) return;

    // Physics
    this.ball.x += this.ball.dx * dt;
    this.ball.y += this.ball.dy * dt;

    // Wall bounce
    if (this.ball.x < 6 || this.ball.x > W - 6) this.ball.dx *= -1;
    if (this.ball.y < 6) this.ball.dy *= -1;

    // Paddle bounce
    if (this.ball.y > H - 26 &&
        Math.abs(this.ball.x - this.paddleX) < 44) {
      this.ball.dy = -Math.abs(this.ball.dy);
    }

    // Brick collision
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (this.ball.x > b.x && this.ball.x < b.x + 50 &&
          this.ball.y > b.y && this.ball.y < b.y + 18) {
        b.alive = false;
        this.ball.dy *= -1;
        this.score += 10;
      }
    }

    // Bottom edge — lose a life
    if (this.ball.y > H) {
      this.lives--;
      this.ball = { x: 300, y: 250, dx: 200, dy: -300 };
      this.running = false;
    }
  };

  update() {
    return (
      <div class="game-wrapper">
        <div class="hud">Score: {this.score} | Lives: {this.lives}</div>
        <div class="canvas-container"
             onMousemove={(e: MouseEvent) => {
               const r = (e.target as Element).getBoundingClientRect();
               this.paddleX = ((e.clientX - r.left) / r.width) * 600;
             }}
             onClick={() => { this.running = true; }}>
          <loom-canvas draw={this.draw} />
        </div>
      </div>
    );
  }
}`;
