/**
 * Loom — Virtual List Element
 *
 * Dynamic-height virtual list as a LoomElement web component.
 * Renders only visible items from a large dataset, measuring
 * actual heights after paint and caching them.
 *
 * Height strategy: the host sets its own inline height to match
 * total content.  The consumer's min-height / max-height clamp it.
 * The viewport uses height:100% + overflow-y:auto, which resolves
 * correctly because the host has a definite (inline) height.
 *
 * Usage:
 *   const vl = document.createElement("loom-virtual") as LoomVirtual<Msg>;
 *   vl.estimatedHeight = 44;
 *   vl.renderItem = (msg, i) => <div class="msg">{msg.text}</div>;
 *   vl.setItems(messages);
 *   parent.appendChild(vl);
 */

import { LoomElement } from "./element";
import { component } from "./decorators";
import { css } from "../css";

const styles = css`
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

export interface VirtualListOptions<T> {
  estimatedHeight?: number;
  overscan?: number;
  renderItem: (item: T, index: number) => Node;
}

@component("loom-virtual")
export class LoomVirtual<T = any> extends LoomElement {
  /** Estimated height per item in px (before measurement) */
  estimatedHeight = 40;
  /** Extra items above/below visible window */
  overscan = 3;
  /** Render callback — must be set before use */
  renderItem: ((item: T, index: number) => Node) | null = null;
  /** Called when user scrolls near the bottom — use for pagination / infinite scroll */
  onNearEnd: (() => void) | null = null;

  private items: T[] = [];
  private heightCache = new Map<number, number>();
  private offsets: number[] = [0];
  private rangeStart = 0;
  private rangeEnd = 0;
  private rafId = 0;
  private scrolling = false;
  /** When true, automatically scrolls to bottom when new items are added (useful for chat) */
  pinToBottom = true;
  /** When true, host element auto-sizes height to content (clamped by external min/max-height). Set false for fixed-size containers. */
  autoHeight = true;

  private viewport!: HTMLDivElement;
  private spacer!: HTMLDivElement;
  private window!: HTMLDivElement;

  constructor() {
    super();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.shadow.adoptedStyleSheets = [styles];

    // Build skeleton in shadow DOM
    this.viewport = document.createElement("div");
    this.viewport.className = "vl-viewport";

    this.spacer = document.createElement("div");
    this.spacer.className = "vl-spacer";

    this.window = document.createElement("div");
    this.window.className = "vl-window";

    this.spacer.appendChild(this.window);
    this.viewport.appendChild(this.spacer);
    this.shadow.appendChild(this.viewport);

    this.viewport.addEventListener("scroll", this.onScroll, { passive: true });
    this.track(() => this.viewport.removeEventListener("scroll", this.onScroll));
    this.track(() => cancelAnimationFrame(this.rafId));
  }

  // ── Public API ──



  /** Replace the full item list and re-render */
  setItems(items: T[]): void {
    // Only auto-detect pin if already pinned — don't override consumer's explicit false
    if (this.pinToBottom) {
      this.pinToBottom = this.isAtBottom();
    }
    this.items = items;
    // Invalidate range so renderWindow always re-renders with new data
    this.rangeStart = -1;
    this.rangeEnd = -1;
    this.rebuildOffsets();
    this.scheduleRender();
  }

  /** Append items (auto-scrolls if pinned to bottom) */
  push(...newItems: T[]): void {
    this.pinToBottom = this.isAtBottom();
    for (const item of newItems) this.items.push(item);
    this.rangeStart = -1;
    this.rangeEnd = -1;
    this.rebuildOffsets();
    this.scheduleRender();
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
    this.scheduleRender();
  }

  get length(): number {
    return this.items.length;
  }

  // ── Internals ──

  private isAtBottom(): boolean {
    if (!this.viewport) return true;
    const { scrollTop, scrollHeight, clientHeight } = this.viewport;
    return scrollHeight - scrollTop - clientHeight < 30;
  }

  private onScroll = (): void => {
    if (!this.scrolling) {
      this.scrolling = true;
      this.rafId = requestAnimationFrame(() => {
        this.scrolling = false;
        this.renderWindow();

        // Fire near-end callback for infinite scroll
        if (this.onNearEnd && this.viewport) {
          const { scrollTop, scrollHeight, clientHeight } = this.viewport;
          if (scrollHeight - scrollTop - clientHeight < 100) {
            this.onNearEnd();
          }
        }
      });
    }
  };

  private scheduleRender(): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => this.renderWindow());
  }

  private rebuildOffsets(): void {
    const n = this.items.length;
    this.offsets = new Array(n + 1);
    this.offsets[0] = 0;
    for (let i = 0; i < n; i++) {
      this.offsets[i + 1] = this.offsets[i] + (this.heightCache.get(i) ?? this.estimatedHeight);
    }
    if (this.spacer) this.spacer.style.height = `${this.offsets[n]}px`;

    // Set host height to total content — external min/max-height will clamp
    if (this.autoHeight) {
      this.style.height = `${this.offsets[n]}px`;
    }
  }

  /** Binary search for first item whose bottom edge >= scrollTop */
  private findStart(scrollTop: number): number {
    let lo = 0, hi = this.items.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.offsets[mid + 1] <= scrollTop) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private renderWindow(): void {
    if (!this.renderItem || !this.viewport || !this.window) return;
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
      requestAnimationFrame(() => this.scheduleRender());
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
      frag.appendChild(this.renderItem(this.items[i], i));
    }
    this.window.textContent = "";
    this.window.appendChild(frag);

    // Measure after paint
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
