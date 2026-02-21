// ── Symbol keys ──
// Shared contract between decorators and LoomElement.
// All symbols are created via createSymbol() and auto-registered
// in SYMBOL_REGISTRY for introspection by inspect().

const SYMBOL_REGISTRY = new Map<string, symbol>();

export function createSymbol(name: string): symbol {
  const existing = SYMBOL_REGISTRY.get(name);
  if (existing) return existing;
  const sym = Symbol(`loom:${name}`);
  SYMBOL_REGISTRY.set(name, sym);
  return sym;
}

export { SYMBOL_REGISTRY };

export const REACTIVES           = createSymbol("reactives");
export const PROPS               = createSymbol("props");
export const ON_HANDLERS         = createSymbol("on");
export const WATCHERS            = createSymbol("watch");
export const EMITTERS            = createSymbol("emit");
export const COMPUTED_DIRTY      = createSymbol("computed:dirty");
export const CATCH_HANDLER       = createSymbol("catch");
export const CATCH_HANDLERS      = createSymbol("catch:named");
export const MOUNT_HANDLERS      = createSymbol("mount");
export const UNMOUNT_HANDLERS    = createSymbol("unmount");
export const INJECT_PARAMS       = createSymbol("inject:params");
export const ROUTE_PROPS         = createSymbol("route:props");
export const TRANSFORMS          = createSymbol("transforms");
export const ROUTE_ENTER         = createSymbol("route:enter");
export const ROUTE_LEAVE         = createSymbol("route:leave");
export const CONNECT_HOOKS       = createSymbol("connect:hooks");
export const FIRST_UPDATED_HOOKS = createSymbol("first-updated:hooks");
