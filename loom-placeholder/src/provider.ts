/**
 * LoomPlaceholder — PlaceholderProvider abstract class
 *
 * Base class for all placeholder providers. Extend and register via DI:
 *
 *   app.use(PlaceholderProvider, new RgbaPlaceholder());
 *
 * Swap providers to use a different placeholder service without
 * changing any component code.
 */

import type { PlaceholderOptions } from "./types.js";

export abstract class PlaceholderProvider {
  /** Generate a placeholder URL for the given options */
  abstract url(options: PlaceholderOptions): string;
}
