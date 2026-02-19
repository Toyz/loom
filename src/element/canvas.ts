/**
 * Loom — Canvas Element
 *
 * Built-in `<loom-canvas>` web component that wraps a `<canvas>`
 * with loom-keep, auto-resize via @observer, and per-frame
 * draw callbacks through Loom's centralized RenderLoop.
 *
 * Usage:
 *   <loom-canvas draw={(ctx, dt, t) => {
 *     ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
 *     ctx.fillRect(x, y, 20, 20);
 *   }} />
 *
 * The draw callback receives (CanvasRenderingContext2D, deltaTime, timestamp).
 * Set autoResize={false} and width/height props for fixed-size canvases.
 */

import { LoomElement } from "./element";
import { component, query, styles } from "./decorators";
import { prop } from "../store/decorators";
import { css } from "../css";
import { animationFrame } from "./timing";
import { event } from "./events";
import { observer } from "./observers";

const canvasStyles = css`
  :host {
    display: block;
    position: relative;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
`;

export type DrawCallback = (
  ctx: CanvasRenderingContext2D,
  dt: number,
  t: number,
) => void;

@component("loom-canvas")
@styles(canvasStyles)
export class LoomCanvas extends LoomElement {

  // ── Public props ──

  /** Fixed width in CSS pixels (ignored when autoResize is true) */
  @prop accessor width = 0;

  /** Fixed height in CSS pixels (ignored when autoResize is true) */
  @prop accessor height = 0;

  /** When true, canvas auto-sizes to match host element bounds */
  @prop accessor autoResize = true;

  /** Per-frame draw callback: (ctx, deltaTime, timestamp) => void */
  @event<DrawCallback>() accessor draw: DrawCallback | null = null;

  // ── DOM refs ──

  @query<HTMLCanvasElement>("canvas")
  accessor canvasEl!: HTMLCanvasElement;

  // ── Internal ──

  private _ctx: CanvasRenderingContext2D | null = null;

  /** Cached 2D rendering context */
  get ctx(): CanvasRenderingContext2D {
    if (!this._ctx) {
      this._ctx = this.canvasEl.getContext("2d")!;
    }
    return this._ctx;
  }

  /** Reference to the raw <canvas> element */
  get canvas(): HTMLCanvasElement {
    return this.canvasEl;
  }

  // ── Lifecycle ──

  update(): Node {
    const c = document.createElement("canvas");
    c.setAttribute("loom-keep", "");

    if (!this.autoResize && this.width && this.height) {
      c.width = this.width;
      c.height = this.height;
    }

    return c;
  }

  @observer("resize")
  private onResize(entry: ResizeObserverEntry) {
    if (!this.autoResize) return;
    const { width, height } = entry.contentRect;
    const dpr = window.devicePixelRatio || 1;
    this.canvasEl.width = Math.round(width * dpr);
    this.canvasEl.height = Math.round(height * dpr);
    this.ctx.scale(dpr, dpr);
  }

  /** Clear the full canvas */
  clear() {
    this.ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);
  }

  // ── Render loop ──

  @animationFrame
  private tick(dt: number, t: number): void {
    if (this.draw) {
      this.draw(this.ctx, dt, t);
    }
  }

  /** Block morph after initial skeleton */
  shouldUpdate(): boolean {
    return !this.canvasEl;
  }
}
