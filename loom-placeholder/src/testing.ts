/**
 * LoomPlaceholder — Testing utilities
 *
 * ```ts
 * import { MockPlaceholder } from "@toyz/loom-placeholder/testing";
 *
 * const mock = new MockPlaceholder();
 * app.use(PlaceholderProvider, mock);
 *
 * // ... mount components ...
 *
 * mock.assertCalled(1);
 * mock.assertCalledWith({ width: 300, height: 200 });
 * mock.reset();
 * ```
 */

import { PlaceholderProvider } from "./provider";
import type { PlaceholderOptions } from "./types";

export class MockPlaceholder extends PlaceholderProvider {
  /** Recorded calls to url() */
  calls: PlaceholderOptions[] = [];

  /** Returns a predictable mock URL */
  url(options: PlaceholderOptions): string {
    this.calls.push({ ...options });
    return `mock://${options.width}x${options.height}`;
  }

  /** Assert that url() was called exactly N times */
  assertCalled(count: number): void {
    if (this.calls.length !== count) {
      throw new Error(
        `Expected ${count} placeholder calls, got ${this.calls.length}`,
      );
    }
  }

  /** Assert that url() was called with options matching the given subset */
  assertCalledWith(partial: Partial<PlaceholderOptions>): void {
    const match = this.calls.some((call) =>
      Object.entries(partial).every(
        ([key, value]) => call[key as keyof PlaceholderOptions] === value,
      ),
    );
    if (!match) {
      throw new Error(
        `No placeholder call matched ${JSON.stringify(partial)}. Calls: ${JSON.stringify(this.calls)}`,
      );
    }
  }

  /** Clear recorded calls */
  reset(): void {
    this.calls = [];
  }
}
