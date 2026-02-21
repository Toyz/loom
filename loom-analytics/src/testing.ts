/**
 * LoomAnalytics — MockAnalytics (testing transport)
 *
 * Records all tracked events for assertions in tests.
 *
 * ```ts
 * const analytics = new MockAnalytics();
 * app.use(AnalyticsTransport, analytics);
 *
 * // ... interact with component ...
 *
 * analytics.assertTracked("button.click");
 * analytics.assertNotTracked("page.error");
 * console.log(analytics.events);
 * ```
 */

import { AnalyticsTransport } from "./transport";

export interface TrackedEvent {
  event: string;
  meta?: Record<string, any>;
  timestamp: number;
}

export class MockAnalytics extends AnalyticsTransport {
  /** All tracked events, in order */
  readonly events: TrackedEvent[] = [];

  /** Track an event — records to the events array */
  track(event: string, meta?: Record<string, any>): void {
    this.events.push({ event, meta, timestamp: Date.now() });
  }

  /** Assert that an event was tracked, optionally matching metadata */
  assertTracked(event: string, meta?: Record<string, any>): void {
    const match = this.events.find(
      (e) => e.event === event && (!meta || this.metaMatches(e.meta, meta)),
    );
    if (!match) {
      const recorded = this.events.map((e) => e.event).join(", ") || "(none)";
      throw new Error(
        `[MockAnalytics] Expected "${event}" to be tracked. Recorded: ${recorded}`,
      );
    }
  }

  /** Assert that an event was NOT tracked */
  assertNotTracked(event: string): void {
    const match = this.events.find((e) => e.event === event);
    if (match) {
      throw new Error(
        `[MockAnalytics] Expected "${event}" to NOT be tracked, but it was.`,
      );
    }
  }

  /** Clear all recorded events */
  reset(): void {
    this.events.length = 0;
  }

  /** Partial metadata match */
  private metaMatches(
    actual: Record<string, any> | undefined,
    expected: Record<string, any>,
  ): boolean {
    if (!actual) return false;
    return Object.entries(expected).every(
      ([key, value]) => actual[key] === value,
    );
  }
}
