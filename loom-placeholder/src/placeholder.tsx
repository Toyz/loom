/**
 * LoomPlaceholder — <loom-placeholder> component
 *
 * A LoomElement that renders a placeholder image via the
 * registered PlaceholderProvider (default: RgbaPlaceholder → rgba.lol).
 *
 * ```tsx
 * <loom-placeholder color="ff0000" width={300} height={200} />
 * <loom-placeholder color="00ff0080" width={64} height={64} format="svg" />
 * ```
 *
 * The `color` prop accepts hex without `#`:
 *   - 6 chars → RGB  (e.g. `"ff00aa"`)
 *   - 8 chars → RGBA (e.g. `"ff00aa80"`)
 */

import { LoomElement, component, prop, css, styles, app } from "@toyz/loom";
import { PlaceholderProvider } from "./provider";
import type { RgbaOptions } from "./types";

const placeholderStyles = css`
  :host {
    display: inline-block;
    line-height: 0;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

@component("loom-placeholder")
@styles(placeholderStyles)
export class LoomImagePlaceholder extends LoomElement {
  /** Hex color without # — 6 chars (RGB) or 8 chars (RGBA) */
  @prop accessor color = "cccccc";

  /** Width in pixels */
  @prop accessor width = 100;

  /** Height in pixels */
  @prop accessor height = 100;

  /** Image format */
  @prop accessor format: "png" | "svg" = "png";

  /** Alt text for accessibility */
  @prop accessor alt = "placeholder";

  /** Parse hex color string into r/g/b/a channels */
  private parseColor(): { r: number; g: number; b: number; a?: number } {
    const hex = this.color.replace(/^#/, "");

    const r = parseInt(hex.slice(0, 2) || "cc", 16);
    const g = parseInt(hex.slice(2, 4) || "cc", 16);
    const b = parseInt(hex.slice(4, 6) || "cc", 16);
    const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) : undefined;

    return { r, g, b, a };
  }

  /** Build the placeholder URL via the registered provider */
  private buildSrc(): string {
    const provider = app.get(PlaceholderProvider);
    const { r, g, b, a } = this.parseColor();
    const options: RgbaOptions = {
      r,
      g,
      b,
      width: this.width,
      height: this.height,
      format: this.format,
    };
    if (a !== undefined) options.a = a;
    return provider.url(options);
  }

  update() {
    const src = this.buildSrc();
    return (
      <img
        src={src}
        alt={this.alt}
        width={this.width}
        height={this.height}
      />
    );
  }
}
