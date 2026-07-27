/**
 * Loom — Query module barrel
 */

// Types
export type { ApiCtx, ApiState, ApiOptions, InterceptRegistration } from "./types.js";

// Events
export { ApiStale } from "./events.js";

// Core factory
export { createApiState } from "./state.js";

// Decorators
export { api, intercept, interceptRegistry } from "./decorators.js";
export type { InterceptOptions } from "./decorators.js";

// @fetch — the common case of @api, with interceptors and status checking.
// Named `fetch`, which shadows the global in any module that imports it;
// `import { fetch as fetchJson }` if you need both.
export { fetch, HttpError } from "./fetch.js";
export type { FetchOptions, FetchAs } from "./fetch.js";
