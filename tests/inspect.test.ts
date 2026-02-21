/**
 * Tests: createSymbol factory, SYMBOL_REGISTRY, and inspect()
 *
 * Covers:
 *   - createSymbol() registers in SYMBOL_REGISTRY
 *   - All 17 core symbols are in the registry
 *   - inspect() reads metadata from decorated classes
 *   - installGlobalHook() attaches to window
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSymbol, LoomSymbol, SYMBOL_REGISTRY } from "../src/decorators/symbols";
import { inspect, installGlobalHook } from "../src/debug/inspect";
import { reactive } from "../src/store/decorators";
import { REACTIVES, PROPS, ROUTE_PROPS } from "../src/decorators/symbols";

describe("createSymbol", () => {
  it("creates a symbol with loom: prefix", () => {
    const sym = createSymbol("test:example");
    expect(sym).toBeInstanceOf(LoomSymbol);
    expect(sym.toString()).toContain("loom:test:example");
  });

  it("registers the symbol in SYMBOL_REGISTRY", () => {
    const sym = createSymbol("test:registered");
    expect(SYMBOL_REGISTRY.get("test:registered")).toBe(sym);
  });

  it("creates unique symbols for each call", () => {
    const a = createSymbol("test:unique-a");
    const b = createSymbol("test:unique-b");
    expect(a).not.toBe(b);
  });
});

describe("SYMBOL_REGISTRY", () => {
  it("contains all 17 core symbols", () => {
    const coreNames = [
      "reactives", "props", "on", "watch", "emit",
      "computed:dirty", "catch", "catch:named",
      "mount", "unmount", "inject:params",
      "route:props", "transforms",
      "route:enter", "route:leave",
      "connect:hooks", "first-updated:hooks",
    ];

    for (const name of coreNames) {
      expect(SYMBOL_REGISTRY.has(name), `Missing: ${name}`).toBe(true);
      expect(SYMBOL_REGISTRY.get(name)).toBeInstanceOf(LoomSymbol);
    }
  });

  it("registry symbols match exported consts", () => {
    expect(SYMBOL_REGISTRY.get("reactives")).toBe(REACTIVES);
    expect(SYMBOL_REGISTRY.get("props")).toBe(PROPS);
    expect(SYMBOL_REGISTRY.get("route:props")).toBe(ROUTE_PROPS);
  });
});

describe("inspect()", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("does not throw on a plain object with tagName", () => {
    const fakeEl = {
      tagName: "DIV",
      constructor: HTMLElement,
    } as unknown as Element;

    expect(() => inspect(fakeEl)).not.toThrow();
  });

  it("reads REACTIVES metadata from a class", () => {
    class MyWidget {
      static [REACTIVES.key] = ["count", "name"];
    }

    const consoleSpy = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    const fakeEl = Object.create(MyWidget.prototype);
    fakeEl.tagName = "MY-WIDGET";
    fakeEl.shadowRoot = null;
    fakeEl.getRootNode = () => ({ adoptedStyleSheets: [] });
    fakeEl.count = 42;
    fakeEl.name = "hello";

    inspect(fakeEl);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("my-widget"),
      expect.any(String),
      expect.any(String),
      expect.any(String),
    );
  });

  it("warns on non-element input", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    inspect(null as any);
    expect(warnSpy).toHaveBeenCalledWith("[Loom] inspect() requires an Element");
  });
});

describe("installGlobalHook()", () => {
  it("attaches __loom.inspect to window", () => {
    installGlobalHook();
    expect((globalThis as any).__loom).toBeDefined();
    expect((globalThis as any).__loom.inspect).toBe(inspect);
    expect((globalThis as any).__loom.SYMBOL_REGISTRY).toBe(SYMBOL_REGISTRY);
    // Clean up
    delete (globalThis as any).__loom;
  });
});
