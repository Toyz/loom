/**
 * LoomPlaceholder — Type definitions
 *
 * Shared options for all placeholder providers.
 */

/** Base options for generating a placeholder URL */
export interface PlaceholderOptions {
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Image format (default: "png") */
  format?: "png" | "svg";
}

/** Options for RGBA color placeholders */
export interface RgbaOptions extends PlaceholderOptions {
  /** Red channel 0-255 */
  r: number;
  /** Green channel 0-255 */
  g: number;
  /** Blue channel 0-255 */
  b: number;
  /** Alpha channel 0-255 (optional — omit for opaque) */
  a?: number;
}
