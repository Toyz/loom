/**
 * Loom Debug — Component inspector
 *
 * Zero-install DevTools alternative.
 * Reads metadata from SYMBOL_REGISTRY and pretty-prints to console.
 *
 * Usage:
 *   import { inspect } from "@toyz/loom/debug";
 *   inspect(document.querySelector("my-component"));
 *
 * Or install the global hook once:
 *   import { installGlobalHook } from "@toyz/loom/debug";
 *   installGlobalHook();
 *   // Then in DevTools console: __loom.inspect($0)
 */
import { SYMBOL_REGISTRY } from "../decorators/symbols";

/**
 * Inspect a Loom element's metadata and current state.
 * Reads all registered symbols from the constructor and logs to console.
 */
export function inspect(el: Element): void {
  if (!el || typeof (el as any).tagName !== "string") {
    console.warn("[Loom] inspect() requires an Element");
    return;
  }

  const ctor = el.constructor as any;
  const tag = el.tagName.toLowerCase();

  // Collect all registered metadata
  const meta: Record<string, any> = {};
  for (const [name, sym] of SYMBOL_REGISTRY) {
    const val = ctor[sym.key];
    if (val !== undefined) {
      // Convert Maps to plain objects for readability
      meta[name] = val instanceof Map ? Object.fromEntries(val) : val;
    }
  }

  // Extract current reactive state
  const state: Record<string, any> = {};
  const reactiveKeys: string[] = meta.reactives ?? [];
  for (const key of reactiveKeys) {
    try {
      state[key] = (el as any)[key];
    } catch {
      state[key] = "<error reading>";
    }
  }

  // Extract current prop values
  const propKeys: Array<{ key: string }> = meta.props ?? [];
  const props: Record<string, any> = {};
  for (const p of propKeys) {
    const k = typeof p === "string" ? p : p.key;
    try {
      props[k] = (el as any)[k];
    } catch {
      props[k] = "<error reading>";
    }
  }

  // Pretty print
  const shadow = !ctor.__loom_noshadow;
  const stylesheetCount =
    (shadow ? el.shadowRoot?.adoptedStyleSheets?.length : (el.getRootNode() as any).adoptedStyleSheets?.length) ?? 0;

  console.groupCollapsed(
    `%cLoom %c<${tag}>%c ${shadow ? "shadow" : "light"} DOM`,
    "color:#818cf8;font-weight:bold",
    "color:#34d399;font-weight:bold",
    "color:#94a3b8",
  );

  if (Object.keys(state).length > 0) {
    console.log("%cState", "color:#fbbf24;font-weight:bold", state);
  }
  if (Object.keys(props).length > 0) {
    console.log("%cProps", "color:#60a5fa;font-weight:bold", props);
  }

  console.log("%cMetadata", "color:#f472b6;font-weight:bold", meta);
  console.log("%cStylesheets", "color:#a78bfa", stylesheetCount);
  console.log("%cConstructor", "color:#94a3b8", ctor);

  console.groupEnd();
}

/**
 * Install a global hook for DevTools console access.
 * After calling this, use __loom.inspect($0) in the console.
 */
export function installGlobalHook(): void {
  (window as any).__loom = { inspect, SYMBOL_REGISTRY };
}
