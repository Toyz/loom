/**
 * Loom — Image Element
 *
 * Built-in `<loom-image>` web component with:
 *  - Lazy loading via @observer("intersection")
 *  - In-memory image cache (static Map) — repeated URLs are instant
 *  - Smooth fade-in on load
 *  - Customizable placeholder (slot or default shimmer)
 *
 * Usage:
 *   <loom-image src="/photo.jpg" alt="Description" />
 *   <loom-image src="/hero.png" width={800} height={400} />
 *
 * Custom placeholder:
 *   <loom-image src="/photo.jpg">
 *     <div slot="placeholder" class="my-skeleton">Loading...</div>
 *   </loom-image>
 */

import { LoomElement } from "./element";
import { component, query, styles } from "./decorators";
import { prop } from "../store/decorators";
import { css } from "../css";
import { observer } from "./observers";

// ── Static image cache ──
const imageCache = new Map<string, HTMLImageElement>();

const imageStyles = css`
  :host {
    display: inline-block;
    position: relative;
    overflow: hidden;
    line-height: 0;
  }

  .placeholder {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    z-index: 1;
    transition: opacity 0.3s ease;
  }

  .placeholder.hidden {
    opacity: 0;
    pointer-events: none;
  }

  .default-skeleton {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.04) 25%,
      rgba(255,255,255,0.08) 50%,
      rgba(255,255,255,0.04) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: inherit;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  img.loaded {
    opacity: 1;
  }
`;

@component("loom-image")
@styles(imageStyles)
export class LoomImage extends LoomElement {

  // ── Public props ──

  /** Image source URL */
  @prop accessor src = "";

  /** Alt text for accessibility */
  @prop accessor alt = "";

  /** Fixed width in CSS pixels (optional) */
  @prop accessor width = 0;

  /** Fixed height in CSS pixels (optional) */
  @prop accessor height = 0;

  /** Object-fit mode for the image */
  @prop accessor fit: string = "cover";

  // ── Internal state ──

  private _loaded = false;
  private _visible = false;

  // ── DOM refs ──

  @query<HTMLImageElement>("img")
  accessor imgEl!: HTMLImageElement;

  @query<HTMLDivElement>(".placeholder")
  accessor placeholderEl!: HTMLDivElement;

  // ── Lazy loading via @observer ──

  @observer("intersection", { threshold: 0.01, rootMargin: "200px" })
  private onIntersect(entry: IntersectionObserverEntry) {
    if (entry.isIntersecting && !this._visible) {
      this._visible = true;
      this.loadImage();
    }
  }

  // ── Image loading with cache ──

  private loadImage() {
    if (!this.src) return;

    // Check cache first
    const cached = imageCache.get(this.src);
    if (cached) {
      this.applyImage(cached.src);
      return;
    }

    // Load and cache
    const img = new Image();
    img.onload = () => {
      imageCache.set(this.src, img);
      this.applyImage(img.src);
    };
    img.onerror = () => {
      // Still hide placeholder on error
      if (this.placeholderEl) this.placeholderEl.classList.add("hidden");
    };
    img.src = this.src;
  }

  private applyImage(src: string) {
    if (!this.imgEl) return;
    this.imgEl.src = src;
    this.imgEl.onload = () => {
      this._loaded = true;
      this.imgEl.classList.add("loaded");
      if (this.placeholderEl) this.placeholderEl.classList.add("hidden");
    };
    // If cached, image may already be complete
    if (this.imgEl.complete) {
      this._loaded = true;
      this.imgEl.classList.add("loaded");
      if (this.placeholderEl) this.placeholderEl.classList.add("hidden");
    }
  }

  // ── Static cache API ──

  /** Preload images into the cache */
  static preload(...urls: string[]): Promise<void[]> {
    return Promise.all(urls.map(url => {
      if (imageCache.has(url)) return Promise.resolve();
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => { imageCache.set(url, img); resolve(); };
        img.onerror = reject;
        img.src = url;
      });
    }));
  }

  /** Clear the image cache (all or specific URL) */
  static clearCache(url?: string) {
    if (url) imageCache.delete(url);
    else imageCache.clear();
  }

  /** Check if a URL is cached */
  static isCached(url: string): boolean {
    return imageCache.has(url);
  }

  // ── Render ──

  update(): Node[] {
    const hostStyle: Record<string, string> = {};
    if (this.width) hostStyle.width = `${this.width}px`;
    if (this.height) hostStyle.height = `${this.height}px`;

    if (Object.keys(hostStyle).length) {
      Object.assign(this.style, hostStyle);
    }

    const img = document.createElement("img");
    img.setAttribute("loom-keep", "");
    img.alt = this.alt;
    if (this.fit) img.style.objectFit = this.fit;

    // Placeholder wrapper: user-slotted content or default shimmer
    const placeholder = document.createElement("div");
    placeholder.className = "placeholder";
    placeholder.setAttribute("loom-keep", "");

    const slot = document.createElement("slot");
    slot.name = "placeholder";

    // Default skeleton shown when no slotted content
    const defaultSkeleton = document.createElement("div");
    defaultSkeleton.className = "default-skeleton";
    slot.appendChild(defaultSkeleton);

    placeholder.appendChild(slot);

    return [placeholder, img];
  }

  shouldUpdate(): boolean {
    return !this.imgEl;
  }
}
