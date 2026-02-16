// ── Symbol keys ──
// Shared contract between decorators and LoomElement.

export const REACTIVES = Symbol("loom:reactives");
export const PROPS = Symbol("loom:props");
export const ON_HANDLERS = Symbol("loom:on");
export const WATCHERS = Symbol("loom:watch");
export const EMITTERS = Symbol("loom:emit");
export const COMPUTED_DIRTY = Symbol("loom:computed:dirty");
export const CATCH_HANDLER = Symbol("loom:catch");
export const MOUNT_HANDLERS = Symbol("loom:mount");
export const UNMOUNT_HANDLERS = Symbol("loom:unmount");
export const INJECT_PARAMS = Symbol("loom:inject:params");
export const ROUTE_PROPS = Symbol("loom:route:props");
export const TRANSFORMS = Symbol("loom:transforms");
export const ROUTE_ENTER = Symbol("loom:route:enter");
export const ROUTE_LEAVE = Symbol("loom:route:leave");
