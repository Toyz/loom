/**
 * LoomAnalytics — AnalyticsTransport
 *
 * Abstract base class for analytics transports.
 * Implement this to send events to any analytics backend.
 *
 * ```ts
 * class PostHogTransport extends AnalyticsTransport {
 *   track(event: string, meta?: Record<string, any>): void {
 *     posthog.capture(event, meta);
 *   }
 * }
 *
 * app.use(AnalyticsTransport, new PostHogTransport());
 * ```
 */

export abstract class AnalyticsTransport {
  /**
   * Track an event with optional metadata.
   *
   * @param event - The event name (e.g. "button.click", "page.view")
   * @param meta  - Optional metadata payload
   */
  abstract track(event: string, meta?: Record<string, any>): void;
}
