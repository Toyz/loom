/**
 * Loom — Query module barrel
 */

// Types
export type { ApiCtx, ApiState, ApiOptions, InterceptRegistration } from "./types";

// Events
export { ApiStale } from "./events";

// Core factory
export { createApiState } from "./state";

// Decorators
export { api, intercept, interceptRegistry } from "./decorators";
export type { InterceptOptions } from "./decorators";

// @fetch — the common case of @api, with interceptors and status checking.
// Named `fetch`, which shadows the global in any module that imports it;
// `import { fetch as fetchJson }` if you need both.
export { fetch, HttpError } from "./fetch";
export type { FetchOptions, FetchAs } from "./fetch";
