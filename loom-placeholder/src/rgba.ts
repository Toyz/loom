/**
 * LoomPlaceholder — RgbaPlaceholder
 *
 * Placeholder provider backed by rgba.lol.
 *
 * URL format:
 *   https://rgba.lol/rr/gg/bb/WxH.png        (RGB)
 *   https://rgba.lol/rr/gg/bb/aa/WxH.png     (RGBA)
 *
 * ```ts
 * import { app } from "@toyz/loom";
 * import { PlaceholderProvider, RgbaPlaceholder } from "@toyz/loom-placeholder";
 *
 * app.use(PlaceholderProvider, new RgbaPlaceholder());
 * ```
 */

import { PlaceholderProvider } from "./provider";
import type { PlaceholderOptions, RgbaOptions } from "./types";

/** Convert 0-255 integer to zero-padded lowercase hex */
function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");
}

/** Type guard: options have RGBA color channels */
function isRgba(opts: PlaceholderOptions): opts is RgbaOptions {
  return "r" in opts && "g" in opts && "b" in opts;
}

export class RgbaPlaceholder extends PlaceholderProvider {
  private readonly baseUrl: string;

  constructor(baseUrl = "https://rgba.lol") {
    super();
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /**
   * Generate an rgba.lol URL.
   *
   * If the options include r/g/b channels, builds a color URL.
   * Otherwise falls back to a default gray.
   */
  url(options: PlaceholderOptions): string {
    if (isRgba(options)) {
      return this.rgba(options);
    }
    // Default: gray placeholder
    return this.rgba({
      ...options,
      r: 204,
      g: 204,
      b: 204,
    });
  }

  /**
   * Build an rgba.lol color URL directly.
   *
   * ```ts
   * provider.rgba({ r: 255, g: 0, b: 170, width: 300, height: 200 })
   * // → "https://rgba.lol/ff/00/aa/300x200.png"
   *
   * provider.rgba({ r: 255, g: 0, b: 170, a: 128, width: 64, height: 64, format: "svg" })
   * // → "https://rgba.lol/ff/00/aa/80/64x64.svg"
   * ```
   */
  rgba(options: RgbaOptions): string {
    const { r, g, b, a, width, height, format = "png" } = options;
    const parts = [toHex(r), toHex(g), toHex(b)];

    if (a !== undefined) {
      parts.push(toHex(a));
    }

    parts.push(`${width}x${height}.${format}`);

    return `${this.baseUrl}/${parts.join("/")}`;
  }
}
