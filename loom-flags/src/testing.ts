/**
 * LoomFlags — MockFlags (testing transport)
 *
 * Drop-in test provider for @toyz/loom-flags.
 *
 * ```ts
 * import { MockFlags } from "@toyz/loom-flags/testing";
 *
 * const flags = new MockFlags();
 * flags.enable("dark-mode");
 * flags.disable("beta-export");
 * flags.setVariant("checkout-flow", "variant-b");
 *
 * app.use(FlagProvider, flags);
 *
 * flags.assertChecked("dark-mode");
 * flags.assertEnabled("dark-mode");
 * flags.reset();
 * ```
 */

import { FlagProvider } from "./provider";

export class MockFlags extends FlagProvider {
  /** Track which flags were checked (for assertions) */
  readonly checked: string[] = [];

  /** Enable a flag */
  enable(flag: string): void {
    this.set(flag, true);
  }

  /** Disable a flag */
  disable(flag: string): void {
    this.set(flag, false);
  }

  /** Check if a flag is enabled */
  isEnabled(flag: string, _context?: Record<string, any>): boolean {
    this.checked.push(flag);
    return this.flags.get(flag) ?? false;
  }

  /** Get a flag's variant value */
  getVariant<T = string>(flag: string, fallback: T): T {
    this.checked.push(flag);
    const val = this.variants.get(flag);
    return (val !== undefined ? val : fallback) as T;
  }

  /** Assert a flag was checked at least once */
  assertChecked(flag: string): void {
    if (!this.checked.includes(flag)) {
      throw new Error(`Expected flag "${flag}" to be checked, but it was not.`);
    }
  }

  /** Assert a flag was NOT checked */
  assertNotChecked(flag: string): void {
    if (this.checked.includes(flag)) {
      throw new Error(`Expected flag "${flag}" to NOT be checked, but it was.`);
    }
  }

  /** Assert a flag is currently enabled */
  assertEnabled(flag: string): void {
    if (!this.flags.get(flag)) {
      throw new Error(`Expected flag "${flag}" to be enabled, but it is ${this.flags.get(flag) ?? "unset"}.`);
    }
  }

  /** Assert a flag is currently disabled */
  assertDisabled(flag: string): void {
    if (this.flags.get(flag) === true) {
      throw new Error(`Expected flag "${flag}" to be disabled, but it is enabled.`);
    }
  }

  /** Reset all state */
  reset(): void {
    this.flags.clear();
    this.variants.clear();
    this.checked.length = 0;
  }
}
