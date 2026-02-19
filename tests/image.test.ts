/**
 * Tests: <loom-image> static cache API
 *
 * Shadow DOM structure and prop defaults are tested via browser
 * verification since JSDOM does not support @component shadow DOM.
 *
 * Covers:
 *  - isCached returns false for unknown URLs
 *  - preload + isCached integration
 *  - clearCache (all)
 *  - clearCache (specific URL)
 *  - preload skips already-cached URLs
 *  - preload multiple URLs at once
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { LoomImage } from "../src/element/image";

// ── Mock Image for JSDOM (no real image loading) ──

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  complete = false;
  private _src = "";

  get src() { return this._src; }
  set src(v: string) {
    this._src = v;
    // Simulate async image load
    setTimeout(() => {
      this.complete = true;
      this.onload?.();
    }, 0);
  }
}

// ── Mock observers so @component doesn't blow up ──

class MockIntersectionObserver {
  constructor(_cb: any, _opts?: any) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

class MockResizeObserver {
  constructor(_cb: any) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  (globalThis as any).IntersectionObserver = MockIntersectionObserver;
  (globalThis as any).ResizeObserver = MockResizeObserver;
  (globalThis as any)._OrigImage = globalThis.Image;
  (globalThis as any).Image = MockImage;
  LoomImage.clearCache();
});

afterEach(() => {
  if ((globalThis as any)._OrigImage) {
    globalThis.Image = (globalThis as any)._OrigImage;
  }
});

describe("<loom-image> cache API", () => {
  it("isCached returns false for unknown URLs", () => {
    expect(LoomImage.isCached("https://example.com/nope.jpg")).toBe(false);
  });

  it("preload caches a URL", async () => {
    const url = "https://example.com/test.jpg";
    await LoomImage.preload(url);
    expect(LoomImage.isCached(url)).toBe(true);
  });

  it("clearCache clears all entries", async () => {
    await LoomImage.preload("https://example.com/a.jpg");
    expect(LoomImage.isCached("https://example.com/a.jpg")).toBe(true);

    LoomImage.clearCache();
    expect(LoomImage.isCached("https://example.com/a.jpg")).toBe(false);
  });

  it("clearCache with specific URL only clears that URL", async () => {
    const url1 = "https://example.com/a.jpg";
    const url2 = "https://example.com/b.jpg";

    await LoomImage.preload(url1, url2);
    expect(LoomImage.isCached(url1)).toBe(true);
    expect(LoomImage.isCached(url2)).toBe(true);

    LoomImage.clearCache(url1);
    expect(LoomImage.isCached(url1)).toBe(false);
    expect(LoomImage.isCached(url2)).toBe(true);
  });

  it("preload resolves immediately for already-cached URLs", async () => {
    const url = "https://example.com/cached.jpg";
    await LoomImage.preload(url);

    const start = performance.now();
    await LoomImage.preload(url);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
  });

  it("preload caches multiple URLs at once", async () => {
    const urls = [
      "https://example.com/1.jpg",
      "https://example.com/2.jpg",
      "https://example.com/3.jpg",
    ];
    await LoomImage.preload(...urls);

    for (const url of urls) {
      expect(LoomImage.isCached(url)).toBe(true);
    }
  });
});
