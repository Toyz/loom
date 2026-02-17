/**
 * Loom — Intercept Registry
 *
 * Global registry for @intercept-decorated methods.
 * Separated from decorators to avoid circular imports with state.ts.
 */

import type { InterceptRegistration } from "./types";

/** Global interceptor registry — populated by @intercept decorator */
export const interceptRegistry = new Map<string, InterceptRegistration>();
