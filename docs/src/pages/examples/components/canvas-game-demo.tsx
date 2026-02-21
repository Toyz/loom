/**
 * Canvas Game Demo — Breakout Clone
 *
 * A playable brick-breaker built entirely with <loom-canvas>.
 * Mouse/touch controls the paddle, ball bounces off walls,
 * bricks break on impact, score tracked via @reactive.
 */
import { LoomElement, component, reactive, css, styles, query } from "@toyz/loom";
import "@toyz/loom/element/canvas";
import type { DrawCallback } from "@toyz/loom/element/canvas";

const sheet = css`
  :host {
    display: block;
  }
  .game-wrapper {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    align-items: center;
  }
  .hud {
    display: flex;
    gap: 2rem;
    align-items: center;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.9rem;
    color: var(--text-secondary, #9898ad);
  }
  .hud .label { color: var(--text-muted, #5e5e74); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; }
  .hud .value { color: var(--accent, #818cf8); font-size: 1.4rem; font-weight: 700; }
  .canvas-container {
    width: 100%;
    max-width: 600px;
    aspect-ratio: 3 / 2;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border, #2a2a3a);
    background: #0a0a14;
    cursor: none;
  }
  loom-canvas {
    width: 100%;
    height: 100%;
  }
  .controls {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }
  button {
    padding: 0.5rem 1.25rem;
    border-radius: 8px;
    border: 1px solid var(--border, #2a2a3a);
    background: var(--surface-2, #1a1a2e);
    color: var(--text, #e8e8f0);
    font-size: 0.85rem;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  button:hover {
    background: var(--accent, #818cf8);
    border-color: var(--accent, #818cf8);
    color: #fff;
  }
  .msg {
    color: var(--text-muted, #5e5e74);
    font-size: 0.8rem;
  }
`;

// ── Game constants ──

const COLS = 10;
const ROWS = 5;
const BRICK_PAD = 4;
const PADDLE_H = 12;
const BALL_R = 6;
const BALL_SPEED = 320;

const BRICK_COLORS = ["#f472b6", "#818cf8", "#34d399", "#fbbf24", "#fb923c"];

interface Brick {
  x: number; y: number; w: number; h: number;
  alive: boolean; color: string;
}

@component("canvas-game-demo")
@styles(sheet)
export class CanvasGameDemo extends LoomElement {

  @reactive accessor score = 0;
  @reactive accessor lives = 3;
  @reactive accessor running = false;
  @reactive accessor gameOver = false;

  @query<HTMLDivElement>(".canvas-container")
  accessor container!: HTMLDivElement;

  // Game state (not reactive — managed in draw loop)
  private paddleX = 0;
  private ballX = 0;
  private ballY = 0;
  private ballDX = 0;
  private ballDY = 0;
  private bricks: Brick[] = [];
  private W = 600;
  private H = 400;

  firstUpdated() {
    this.resetGame();

    this.container.addEventListener("mousemove", (e: MouseEvent) => {
      const rect = this.container.getBoundingClientRect();
      this.paddleX = ((e.clientX - rect.left) / rect.width) * this.W;
    });
    this.container.addEventListener("touchmove", (e: TouchEvent) => {
      e.preventDefault();
      const rect = this.container.getBoundingClientRect();
      const touch = e.touches[0];
      this.paddleX = ((touch.clientX - rect.left) / rect.width) * this.W;
    }, { passive: false });
    this.container.addEventListener("click", () => {
      if (!this.running && !this.gameOver) this.start();
    });
  }

  resetGame() {
    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.running = false;
    this.buildBricks();
    this.resetBall();
  }

  buildBricks() {
    this.bricks = [];
    const bw = (this.W - BRICK_PAD * (COLS + 1)) / COLS;
    const bh = 20;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.bricks.push({
          x: BRICK_PAD + c * (bw + BRICK_PAD),
          y: 40 + r * (bh + BRICK_PAD),
          w: bw,
          h: bh,
          alive: true,
          color: BRICK_COLORS[r % BRICK_COLORS.length],
        });
      }
    }
  }

  resetBall() {
    this.ballX = this.W / 2;
    this.ballY = this.H - 60;
    const angle = -Math.PI / 4 + Math.random() * (-Math.PI / 2);
    this.ballDX = Math.cos(angle) * BALL_SPEED;
    this.ballDY = Math.sin(angle) * BALL_SPEED;
    if (this.ballDY > 0) this.ballDY = -this.ballDY; // Always start upward
  }

  start() {
    this.running = true;
  }

  draw: DrawCallback = (ctx, dt) => {
    const dpr = window.devicePixelRatio || 1;
    this.W = ctx.canvas.width / dpr;
    this.H = ctx.canvas.height / dpr;

    // Clear
    ctx.clearRect(0, 0, this.W, this.H);

    // Background
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, this.W, this.H);

    // Draw bricks
    for (const b of this.bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      this.roundRect(ctx, b.x, b.y, b.w, b.h, 4);
      ctx.fill();
    }

    // Draw paddle
    const pw = 80;
    const px = Math.max(0, Math.min(this.W - pw, this.paddleX - pw / 2));
    const py = this.H - 30;
    ctx.fillStyle = "#818cf8";
    ctx.beginPath();
    this.roundRect(ctx, px, py, pw, PADDLE_H, 6);
    ctx.fill();

    // Draw ball
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // Show start message if not running
    if (!this.running && !this.gameOver) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "16px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Click to start", this.W / 2, this.H / 2 + 40);
      return;
    }

    // Game over
    if (this.gameOver) {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "bold 28px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", this.W / 2, this.H / 2);
      ctx.font = "14px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(`Score: ${this.score}`, this.W / 2, this.H / 2 + 30);
      return;
    }

    // Win check
    if (this.bricks.every(b => !b.alive)) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "bold 28px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("You Win!", this.W / 2, this.H / 2);
      this.running = false;
      return;
    }

    // ── Physics ──
    if (!this.running) return;

    // Cap delta to avoid tunneling on tab switch
    const safeDt = Math.min(dt, 0.05);

    this.ballX += this.ballDX * safeDt;
    this.ballY += this.ballDY * safeDt;

    // Wall bounces
    if (this.ballX - BALL_R < 0) { this.ballX = BALL_R; this.ballDX = Math.abs(this.ballDX); }
    if (this.ballX + BALL_R > this.W) { this.ballX = this.W - BALL_R; this.ballDX = -Math.abs(this.ballDX); }
    if (this.ballY - BALL_R < 0) { this.ballY = BALL_R; this.ballDY = Math.abs(this.ballDY); }

    // Bottom — lose life
    if (this.ballY + BALL_R > this.H) {
      this.lives--;
      if (this.lives <= 0) {
        this.running = false;
        this.gameOver = true;
      } else {
        this.resetBall();
      }
      return;
    }

    // Paddle collision
    if (
      this.ballDY > 0 &&
      this.ballY + BALL_R >= py &&
      this.ballY + BALL_R <= py + PADDLE_H + 4 &&
      this.ballX >= px &&
      this.ballX <= px + pw
    ) {
      this.ballDY = -Math.abs(this.ballDY);
      // Angle based on hit position
      const hit = (this.ballX - px) / pw; // 0..1
      const angle = (hit - 0.5) * (Math.PI * 0.6);
      const speed = Math.sqrt(this.ballDX ** 2 + this.ballDY ** 2);
      this.ballDX = Math.sin(angle) * speed;
      this.ballDY = -Math.cos(angle) * speed;
    }

    // Brick collision
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (
        this.ballX + BALL_R > b.x &&
        this.ballX - BALL_R < b.x + b.w &&
        this.ballY + BALL_R > b.y &&
        this.ballY - BALL_R < b.y + b.h
      ) {
        b.alive = false;
        this.score += 10;

        // Determine bounce direction
        const overlapX = Math.min(
          this.ballX + BALL_R - b.x,
          b.x + b.w - (this.ballX - BALL_R),
        );
        const overlapY = Math.min(
          this.ballY + BALL_R - b.y,
          b.y + b.h - (this.ballY - BALL_R),
        );
        if (overlapX < overlapY) {
          this.ballDX = -this.ballDX;
        } else {
          this.ballDY = -this.ballDY;
        }
        break; // one brick per frame
      }
    }
  };

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }

  update() {
    return (
      <div class="game-wrapper">
        <div class="hud">
          <div>
            <div class="label">Score</div>
            <div class="value">{this.score}</div>
          </div>
          <div>
            <div class="label">Lives</div>
            <div class="value">{"♥".repeat(this.lives)}</div>
          </div>
        </div>

        <div class="canvas-container">
          <loom-canvas draw={this.draw}></loom-canvas>
        </div>

        <div class="controls">
          <button onClick={() => this.resetGame()}>New Game</button>
          <span class="msg">Move mouse to control paddle</span>
        </div>
      </div>
    );
  }
}
