/**
 * Loom — Virtual List Element
 *
 * Dynamic-height virtual list as a proper LoomElement.
 * Renders only visible items, measures actual heights after paint.
 *
 * Uses the children-as-template pattern:
 *
 *   <loom-virtual items={messages} estimatedHeight={44}>
 *     {(msg: Msg) => <div class="msg">{msg.text}</div>}
 *   </loom-virtual>
 *
 * The function child is stored as __childTemplate by the JSX runtime
 * and used to render each visible item on demand.
 *
 * Rendering strategy:
 *   - The skeleton (viewport > spacer > window) is built once via update()
 *   - shouldUpdate() blocks all subsequent morphs — the skeleton is stable
 *   - @animationFrame ticks every frame via Loom's centralized RenderLoop
 *   - A `dirty` flag gates rendering: scroll events and item changes set it,
 *     the @animationFrame tick checks it and calls renderWindow()
 *   - Post-paint measurement uses a single nested rAF inside renderWindow()
 */

import { LoomElement } from "./element";
import { component, query, styles } from "./decorators";
import { prop, reactive } from "../store/decorators";
import { css } from "../css";
import { animationFrame } from "./timing";

const listStyles = css`
  :host {
    display: block;
  }
  .vl-viewport {
    height: 100%;
    overflow-y: auto;
    scrollbar-width: thin;
  }
  .vl-spacer {
    position: relative;
    width: 100%;
  }
  .vl-window {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
  }
`;

@component("loom-virtual")
@styles(listStyles)
export class LoomVirtual<T = any> extends LoomElement {

  // ── Public props (settable from JSX) ──

  /** Items to virtualize */
  @prop accessor items: T[] = [];

  /** Estimated height per item in px (before measurement) */
  @prop accessor estimatedHeight = 40;

  /** Extra items above/below visible window */
  @prop accessor overscan = 3;

  /** When true, auto-scrolls to bottom on new items (chat mode) */
  @prop accessor pinToBottom = true;

  /** Called when user scrolls near the bottom — use for pagination / infinite scroll */
  onNearEnd: (() => void) | null = null;

  // ── DOM refs via @query ──

  @query<HTMLDivElement>(".vl-viewport")
  accessor viewport!: HTMLDivElement;

  @query<HTMLDivElement>(".vl-spacer")
  accessor spacer!: HTMLDivElement;

  @query<HTMLDivElement>(".vl-window")
  accessor window!: HTMLDivElement;

  // ── Internal state ──

  private heightCache = new Map<number, number>();
  private offsets: number[] = [0];
  private rangeStart = -1;
  private rangeEnd = -1;
  private dirty = false;

  /** Template function from children: {(item, i) => <div>...</div>} */
  private get template(): ((item: T, index: number) => Node) | null {
    return (this as any).__childTemplate ?? null;
  }

  // ── Lifecycle ──

  update(): Node {
    const viewport = document.createElement("div");
    viewport.className = "vl-viewport";

    const spacer = document.createElement("div");
    spacer.className = "vl-spacer";

    const window = document.createElement("div");
    window.className = "vl-window";
    window.setAttribute("loom-keep", "");

    spacer.appendChild(window);
    viewport.appendChild(spacer);
    return viewport;
  }

  firstUpdated(): void {
    this.viewport.addEventListener("scroll", this.onScroll, { passive: true });
    this.track(() => this.viewport.removeEventListener("scroll", this.onScroll));

    // Kick off initial render
    this.invalidate();
  }

  updated(changed: Map<string, any>) {
    if (changed.has("items")) {
      this.invalidate();
    }
  }

  /**
   * Override shouldUpdate: we handle item rendering manually via renderWindow.
   * Only allow full morph on the very first render (when DOM doesn't exist yet).
   */
  shouldUpdate(): boolean {
    // Let the first update() through to build the skeleton
    if (!this.window) return true;

    // After skeleton exists, mark dirty so @animationFrame picks it up
    this.invalidate();
    return false;
  }

  // ── Public API (imperative escape hatches) ──

  /** Append items (auto-scrolls if pinned to bottom) */
  push(...newItems: T[]): void {
    this.pinToBottom = this.isAtBottom();
    this.items = [...this.items, ...newItems];
  }

  /** Scroll to the very bottom */
  scrollToEnd(): void {
    this.pinToBottom = true;
    if (this.viewport) this.viewport.scrollTop = this.viewport.scrollHeight;
  }

  /** Re-measure all visible items */
  refresh(): void {
    this.measureVisible();
    this.rebuildOffsets();
  }

  get length(): number {
    return this.items.length;
  }

  // ── Internals ──

  /** Invalidate range and schedule a render via @animationFrame */
  private invalidate(): void {
    this.heightCache.clear();
    this.rangeStart = -1;
    this.rangeEnd = -1;
    this.rebuildOffsets();

    // Clamp scroll position to new content bounds
    if (this.viewport) {
      const maxScroll = this.viewport.scrollHeight - this.viewport.clientHeight;
      if (this.viewport.scrollTop > maxScroll) {
        this.viewport.scrollTop = Math.max(0, maxScroll);
      }
    }

    this.dirty = true;
  }

  private isAtBottom(): boolean {
    if (!this.viewport) return true;
    const { scrollTop, scrollHeight, clientHeight } = this.viewport;
    return scrollHeight - scrollTop - clientHeight < 30;
  }

  /** Scroll handler — just marks dirty, @animationFrame does the work */
  onScroll = () => {
    this.dirty = true;
  };

  /** Centralized rAF tick via Loom's RenderLoop — only renders when dirty */
  @animationFrame
  private tick(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.renderWindow();

    // Fire near-end callback for infinite scroll
    if (this.onNearEnd && this.viewport) {
      const { scrollTop, scrollHeight, clientHeight } = this.viewport;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        this.onNearEnd();
      }
    }
  }

  rebuildOffsets() {
    const n = this.items.length;
    this.offsets = new Array(n + 1);
    this.offsets[0] = 0;
    for (let i = 0; i < n; i++) {
      this.offsets[i + 1] = this.offsets[i] + (this.heightCache.get(i) ?? this.estimatedHeight);
    }
    if (this.spacer) this.spacer.style.height = `${this.offsets[n]}px`;
  }

  /** Binary search for first item whose bottom edge >= scrollTop */
  findStart(scrollTop: number) {
    let lo = 0, hi = this.items.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.offsets[mid + 1] <= scrollTop) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  renderWindow() {
    const renderFn = this.template;
    if (!renderFn || !this.viewport || !this.window) return;

    const n = this.items.length;
    if (n === 0) {
      this.window.textContent = "";
      this.rangeStart = this.rangeEnd = 0;
      return;
    }

    const scrollTop = this.viewport.scrollTop;
    let viewH = this.viewport.clientHeight;

    // If viewport hasn't laid out yet, render a reasonable chunk and retry next frame
    if (viewH === 0) {
      viewH = this.estimatedHeight * 20;
      this.dirty = true; // retry next frame
    }

    let start = this.findStart(scrollTop);
    let end = start;
    while (end < n && this.offsets[end] < scrollTop + viewH) end++;

    start = Math.max(0, start - this.overscan);
    end = Math.min(n, end + this.overscan);

    if (start === this.rangeStart && end === this.rangeEnd) return;

    this.rangeStart = start;
    this.rangeEnd = end;

    this.window.style.transform = `translateY(${this.offsets[start]}px)`;

    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      frag.appendChild(renderFn(this.items[i], i));
    }

    this.window.textContent = "";
    this.window.appendChild(frag);

    // Measure after paint (needs one more frame for browser to layout)
    requestAnimationFrame(() => {
      this.measureVisible();
      if (this.pinToBottom && this.viewport) {
        this.viewport.scrollTop = this.viewport.scrollHeight;
        this.pinToBottom = false;
      }
    });
  }

  private measureVisible(): void {
    if (!this.window) return;
    const children = this.window.children;
    let dirty = false;
    for (let i = 0; i < children.length; i++) {
      const idx = this.rangeStart + i;
      const h = Math.ceil(children[i].getBoundingClientRect().height);
      if (h > 0 && this.heightCache.get(idx) !== h) {
        this.heightCache.set(idx, h);
        dirty = true;
      }
    }
    if (dirty) this.rebuildOffsets();
  }
}
