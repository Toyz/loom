/**
 * Loom — Query module barrel
 */

// Types
export type { ApiCtx, ApiState, ApiOptions, InterceptRegistration } from "./types";

// Core factory
export { createApiState } from "./state";

// Decorators
export { api, intercept, interceptRegistry } from "./decorators";
export type { InterceptOptions } from "./decorators";
