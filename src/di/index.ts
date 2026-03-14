/**
 * Loom DI — Deprecated barrel (re-exports from app.ts)
 *
 * @deprecated Import from "@toyz/loom" or "@toyz/loom/store" instead.
 * This subpath is kept for backwards compatibility.
 */

// DI decorators (now live in app.ts)
export { service, resolveServiceName, inject, maybe, factory } from "../app";
export { SERVICE_NAME } from "../decorators/symbols";

// DI-aware watch
export { watch } from "./watch";
