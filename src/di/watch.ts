/**
 * @deprecated Use `@watch(Service)` from `@toyz/loom` instead.
 * This module is kept for backward compatibility and will be removed in v1.0.
 */
import { watch as _watch } from "../store/watch";

/** @deprecated Use `@watch(Service)` or `@watch(Service, "prop")` instead. */
export const watch = _watch;
