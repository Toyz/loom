/**
 * Canvas Game Demo — Breakout Clone
 *
 * A playable brick-breaker built entirely with <loom-canvas>.
 * Mouse/touch controls the paddle, ball bounces off walls,
 * bricks break on impact, score tracked via @reactive.
 */
import { LoomElement, component, reactive, css, styles, query } from "@toyz/loom";
import { t } from "../../../tokens";
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
    color: ${t.textSecondary};
  }
  .hud .label { color: var(--text-muted); font-family: ${t.fontMono}; font-size: 0.625rem; text-transform: uppercase; letter-spacing: 0.12em; }
  .hud .value {
    color: var(--text-primary);
    font-family: ${t.fontDisplay};
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.1;
  }
  /* Lives are punches, like every other countable thing in this design. */
  .hud .lives {
    color: var(--thread);
    font-family: ${t.fontMono};
    font-size: 0.875rem;
    letter-spacing: 0.15em;
  }
  .canvas-container {
    width: 100%;
    max-width: 600px;
    aspect-ratio: 3 / 2;
    border-radius: 0;
    overflow: hidden;
    border: 1px solid ${t.border};
    background: ${t.groundSunk};
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
    border-radius: 0;
    border: 1px solid ${t.border};
    background: ${t.surface2};
    color: ${t.text};
    font-family: ${t.fontMono};
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  button:hover {
    background: ${t.accent};
    border-color: ${t.accent};
    color: var(--text-primary);
  }
  .msg {
    color: ${t.textMuted};
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

/* One hue, five values. Five saturated colours read as a different product
   from the rest of the site; a ramp still tells you which row is worth more. */
const BRICK_COLORS = ["#d9573b", t.$value.thread, "#a83c27", "#8c311f", "#702717"];
/* A cleared brick leaves its position behind, the way a card shows an
   unpunched hole. The board reads as it empties. */
const BRICK_GHOST = "rgba(74, 72, 57, 0.30)";

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
    ctx.fillStyle = t.$value.groundSunk;
    ctx.fillRect(0, 0, this.W, this.H);

    // Bricks. Square, because nothing else in this design is rounded, and a
    // cleared one leaves its outline so the card reads as it empties.
    for (const b of this.bricks) {
      if (b.alive) {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      } else {
        ctx.strokeStyle = BRICK_GHOST;
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      }
    }

    // Draw paddle
    const pw = 80;
    const px = Math.max(0, Math.min(this.W - pw, this.paddleX - pw / 2));
    const py = this.H - 30;
    ctx.fillStyle = t.$value.textPrimary;
    ctx.fillRect(px, py, pw, PADDLE_H);

    // Draw ball
    ctx.fillStyle = t.$value.thread;
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // Show start message if not running
    if (!this.running && !this.gameOver) {
      ctx.fillStyle = t.$value.textSecondary;
      ctx.font = "12px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("CLICK TO START", this.W / 2, this.H / 2 + 40);
      return;
    }

    // Game over
    if (this.gameOver) {
      ctx.fillStyle = t.$value.textPrimary;
      ctx.font = "700 26px 'IBM Plex Sans Condensed', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", this.W / 2, this.H / 2);
      ctx.font = "12px 'IBM Plex Mono', monospace";
      ctx.fillStyle = t.$value.textMuted;
      ctx.fillText(`SCORE ${this.score}`, this.W / 2, this.H / 2 + 28);
      return;
    }

    // Win check
    if (this.bricks.every(b => !b.alive)) {
      ctx.fillStyle = t.$value.thread;
      ctx.font = "700 26px 'IBM Plex Sans Condensed', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CARD CLEARED", this.W / 2, this.H / 2);
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
            <div class="value lives">{"\u25A0 ".repeat(this.lives).trim()}</div>
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
