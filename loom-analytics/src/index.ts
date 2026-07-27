/**
 * LoomAnalytics — Barrel exports
 *
 * Zero-dependency, transport-swappable analytics for Loom.
 * Decorator-driven event tracking with TC39 Stage 3 decorators.
 */

// Decorator
export { track } from "./track.js";

// Transport
export { AnalyticsTransport } from "./transport.js";
