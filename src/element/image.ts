/**
 * Loom — Image Element
 *
 * Built-in `<loom-image>` web component with:
 *  - Lazy loading via @observer("intersection")
 *  - In-memory image cache (static Map) — repeated URLs are instant
 *  - Smooth fade-in on load
 *  - Customizable placeholder (slot or default shimmer)
 *  - Error fallback with optional retry URL and customizable error slot
 *
 * Usage:
 *   <loom-image src="/photo.jpg" alt="Description" />
 *   <loom-image src="/hero.png" width={800} height={400} />
 *
 * Custom placeholder:
 *   <loom-image src="/photo.jpg">
 *     <div slot="placeholder" class="my-skeleton">Loading...</div>
 *   </loom-image>
 *
 * Custom error state:
 *   <loom-image src="/photo.jpg" fallback="/fallback.jpg">
 *     <div slot="error">Failed to load image</div>
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

  .placeholder,
  .error {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    z-index: 1;
    transition: opacity 0.3s ease;
  }

  .placeholder.hidden,
  .error.hidden {
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

  .default-error {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.06);
    border-radius: inherit;
    color: rgba(255,255,255,0.3);
  }

  .default-error svg {
    width: 32px;
    height: 32px;
    opacity: 0.5;
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

  /** Fallback image URL — tried when the primary src fails */
  @prop accessor fallback = "";

  // ── Internal state ──

  private _loaded = false;
  private _visible = false;
  private _error = false;

  // ── DOM refs ──

  @query<HTMLImageElement>("img")
  accessor imgEl!: HTMLImageElement;

  @query<HTMLDivElement>(".placeholder")
  accessor placeholderEl!: HTMLDivElement;

  @query<HTMLDivElement>(".error")
  accessor errorEl!: HTMLDivElement;

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
      // Try fallback if available and not already using it
      if (this.fallback && this.src !== this.fallback) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          imageCache.set(this.fallback, fallbackImg);
          this.applyImage(fallbackImg.src);
        };
        fallbackImg.onerror = () => this._showError();
        fallbackImg.src = this.fallback;
        return;
      }
      this._showError();
    };
    img.src = this.src;
  }

  /** Transition to error state — hides placeholder, shows error slot */
  private _showError(): void {
    this._error = true;
    if (this.placeholderEl) this.placeholderEl.classList.add("hidden");
    if (this.errorEl) this.errorEl.classList.remove("hidden");
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

    // Error wrapper: user-slotted content or default broken-image icon
    const errorWrapper = document.createElement("div");
    errorWrapper.className = "error hidden";
    errorWrapper.setAttribute("loom-keep", "");

    const errorSlot = document.createElement("slot");
    errorSlot.name = "error";

    // Default error icon shown when no slotted content
    const defaultError = document.createElement("div");
    defaultError.className = "default-error";
    defaultError.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z"/><circle cx="15.5" cy="9.5" r="1.5"/><line x1="4" y1="4" x2="20" y2="20" stroke-width="2"/></svg>`;
    errorSlot.appendChild(defaultError);

    errorWrapper.appendChild(errorSlot);

    return [placeholder, errorWrapper, img];
  }

  shouldUpdate(): boolean {
    return !this.imgEl;
  }
}
