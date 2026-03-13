/**
 * Tests for the @css / css_decorator — dynamic scoped styles.
 */
import { describe, it, expect, vi } from "vitest";
import { reactive } from "../src/store/decorators";
import { store } from "../src/store/decorators";
import { signal } from "../src/store/signal";
import { dynamicCss } from "../src/element/decorators";
import { CONNECT_HOOKS } from "../src/decorators/symbols";

// Helper: simulate connect lifecycle
function simulateConnect(el: any) {
  const hooks = el[CONNECT_HOOKS.key] as Array<(el: any) => (() => void) | void> | undefined;
  const cleanups: (() => void)[] = [];
  if (hooks) {
    for (const hook of hooks) {
      const cleanup = hook(el);
      if (typeof cleanup === "function") cleanups.push(cleanup);
    }
  }
  return () => { for (const c of cleanups) c(); };
}

const tick = () => new Promise<void>(r => queueMicrotask(() => r()));

// Mock shadow root with adoptedStyleSheets
function createMockShadow() {
  return {
    adoptedStyleSheets: [] as CSSStyleSheet[],
  };
}

describe("@css / css_decorator", () => {
  it("evaluates method and adopts stylesheet on connect", () => {
    class MyEl {
      shadow = createMockShadow();
      scheduleUpdate = vi.fn();

      @dynamicCss
      myStyles() {
        return `:host { color: red; }`;
      }
    }

    const el = new MyEl() as any;
    simulateConnect(el);

    expect(el.shadow.adoptedStyleSheets).toHaveLength(1);
    // CSSStyleSheet is a real browser API — in jsdom it exists
    expect(el.shadow.adoptedStyleSheets[0]).toBeInstanceOf(CSSStyleSheet);
  });

  it("stylesheet content matches method return value", () => {
    class MyEl {
      shadow = createMockShadow();
      scheduleUpdate = vi.fn();

      @dynamicCss
      myStyles() {
        return `.card { padding: 1rem; }`;
      }
    }

    const el = new MyEl() as any;
    simulateConnect(el);

    const sheet = el.shadow.adoptedStyleSheets[0] as CSSStyleSheet;
    const rules = Array.from(sheet.cssRules);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0].cssText).toContain("padding");
  });

  it("re-evaluates when @reactive changes", async () => {
    class MyEl {
      shadow = createMockShadow();
      scheduleUpdate = vi.fn();

      @reactive accessor accent = "#ff0000";

      @dynamicCss
      dynamicStyles() {
        return `:host { --accent: ${this.accent}; }`;
      }
    }

    const el = new MyEl() as any;
    // Read reactive to init it
    void el.accent;
    simulateConnect(el);

    const sheet = el.shadow.adoptedStyleSheets[0] as CSSStyleSheet;
    expect(Array.from(sheet.cssRules)[0].cssText).toContain("#ff0000");

    // Change reactive
    el.accent = "#00ff00";
    await tick();

    // Sheet should have been updated via replaceSync
    expect(Array.from(sheet.cssRules)[0].cssText).toContain("#00ff00");
  });

  it("re-evaluates when @signal changes", async () => {
    class MyEl {
      shadow = createMockShadow();
      scheduleUpdate = vi.fn();

      @signal accessor size = 16;

      @dynamicCss
      dynamicStyles() {
        return `.text { font-size: ${this.size}px; }`;
      }
    }

    const el = new MyEl() as any;
    void el.size;
    simulateConnect(el);

    el.size = 24;
    await tick();

    const sheet = el.shadow.adoptedStyleSheets[0] as CSSStyleSheet;
    expect(Array.from(sheet.cssRules)[0].cssText).toContain("24px");
  });

  it("debounces rapid changes into single replaceSync", async () => {
    let evalCount = 0;

    class MyEl {
      shadow = createMockShadow();
      scheduleUpdate = vi.fn();

      @reactive accessor color = "red";

      @dynamicCss
      dynamicStyles() {
        evalCount++;
        return `:host { color: ${this.color}; }`;
      }
    }

    const el = new MyEl() as any;
    void el.color;
    simulateConnect(el);
    evalCount = 0;

    el.color = "blue";
    el.color = "green";
    el.color = "purple";

    await tick();

    // Should batch into 1 re-evaluation
    expect(evalCount).toBe(1);
    const sheet = el.shadow.adoptedStyleSheets[0] as CSSStyleSheet;
    expect(Array.from(sheet.cssRules)[0].cssText).toContain("purple");
  });

  it("removes stylesheet on disconnect", () => {
    class MyEl {
      shadow = createMockShadow();
      scheduleUpdate = vi.fn();

      @dynamicCss
      myStyles() {
        return `:host { display: block; }`;
      }
    }

    const el = new MyEl() as any;
    const disconnect = simulateConnect(el);

    expect(el.shadow.adoptedStyleSheets).toHaveLength(1);

    disconnect();

    expect(el.shadow.adoptedStyleSheets).toHaveLength(0);
  });

  it("handles empty CSS return gracefully", () => {
    class MyEl {
      shadow = createMockShadow();
      scheduleUpdate = vi.fn();

      @dynamicCss
      myStyles() {
        return "";
      }
    }

    const el = new MyEl() as any;
    simulateConnect(el);

    // Sheet is adopted but empty
    expect(el.shadow.adoptedStyleSheets).toHaveLength(1);
    expect(Array.from(el.shadow.adoptedStyleSheets[0].cssRules)).toHaveLength(0);
  });

  it("multiple @css methods create separate sheets", () => {
    class MyEl {
      shadow = createMockShadow();
      scheduleUpdate = vi.fn();

      @dynamicCss
      layoutStyles() {
        return `:host { display: grid; }`;
      }

      @dynamicCss
      themeStyles() {
        return `:host { color: white; }`;
      }
    }

    const el = new MyEl() as any;
    simulateConnect(el);

    expect(el.shadow.adoptedStyleSheets).toHaveLength(2);
  });

  it("@store changes trigger re-evaluation", async () => {
    class MyEl {
      shadow = createMockShadow();
      scheduleUpdate = vi.fn();

      @store<{ theme: string }>({ theme: "dark" })
      accessor config!: { theme: string };

      @dynamicCss
      dynamicStyles() {
        return `:host { --theme: ${this.config.theme}; }`;
      }
    }

    const el = new MyEl() as any;
    void el.config;
    simulateConnect(el);

    el.config.theme = "light";
    await tick();

    const sheet = el.shadow.adoptedStyleSheets[0] as CSSStyleSheet;
    expect(Array.from(sheet.cssRules)[0].cssText).toContain("light");
  });

  it("each instance gets its own stylesheet", () => {
    class MyEl {
      shadow = createMockShadow();
      scheduleUpdate = vi.fn();

      @dynamicCss
      myStyles() {
        return `:host { color: red; }`;
      }
    }

    const el1 = new MyEl() as any;
    const el2 = new MyEl() as any;
    simulateConnect(el1);
    simulateConnect(el2);

    expect(el1.shadow.adoptedStyleSheets[0]).not.toBe(el2.shadow.adoptedStyleSheets[0]);
  });
});
