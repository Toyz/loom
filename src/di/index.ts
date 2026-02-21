/**
 * Loom DI — Barrel exports
 *
 * Dependency injection decorators and DI-aware @watch.
 */

// DI decorators
export { service, resolveServiceName, inject, factory } from "./decorators";
export { SERVICE_NAME } from "../decorators/symbols";

// DI-aware watch
export { watch } from "./watch";
