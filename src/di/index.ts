/**
 * Loom DI — Barrel exports
 *
 * Dependency injection decorators and DI-aware @watch.
 */

// DI decorators
export { service, SERVICE_NAME, resolveServiceName, inject, factory } from "./decorators";

// DI-aware watch
export { watch } from "./watch";
