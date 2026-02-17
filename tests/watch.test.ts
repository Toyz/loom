/**
 * Tests: @watch — all 3 forms (local field, direct Reactive, DI-resolved service)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { Reactive, CollectionStore } from "../src/store/reactive";
import { watch } from "../src/store/watch";
import { watch as watchService } from "../src/di/watch";
import { reactive } from "../src/store/decorators";
import { app } from "../src/app";

let tagCounter = 0;
function nextTag() { return `test-watch-${++tagCounter}`; }

beforeEach(() => {
  document.body.innerHTML = "";
  // Reset app providers (same pattern as di.test.ts)
  (app as any).providers = new Map();
  (app as any).services = [];
  (app as any).factories = [];
  (app as any).components = [];
  (app as any)._started = false;
});

describe("@watch (local @reactive field)", () => {
  it("calls handler with (value, prev) when @reactive field changes", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @reactive accessor count = 0;

      @watch("count")
      onCount(val: number, prev: number) { fn(val, prev); }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.count = 5;
    expect(fn).toHaveBeenCalledWith(5, 0);
  });

  it("fires on every change", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class El extends LoomElement {
      @reactive accessor count = 0;

      @watch("count")
      onCount(val: number) { fn(val); }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    el.count = 1;
    el.count = 2;
    el.count = 3;
    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenLastCalledWith(3);
  });
});

describe("@watch (direct Reactive instance)", () => {
  it("subscribes to a Reactive on connect and receives (value, prev)", () => {
    const fn = vi.fn();
    const tag = nextTag();
    const counter = new Reactive(0);

    class El extends LoomElement {
      @watch(counter)
      onCounter(val: number, prev: number) { fn(val, prev); }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    counter.set(10);
    expect(fn).toHaveBeenCalledWith(10, 0);
  });

  it("auto-calls scheduleUpdate", async () => {
    const tag = nextTag();
    const counter = new Reactive(0);
    const renderFn = vi.fn();

    class El extends LoomElement {
      @watch(counter)
      onCounter() {}
      update() { renderFn(counter.value); return document.createElement("div"); }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    // Wait for initial render
    await new Promise((r) => queueMicrotask(r));
    renderFn.mockClear();

    counter.set(42);
    await new Promise((r) => queueMicrotask(r));
    expect(renderFn).toHaveBeenCalledWith(42);
  });

  it("unsubscribes on disconnect", () => {
    const fn = vi.fn();
    const tag = nextTag();
    const counter = new Reactive(0);

    class El extends LoomElement {
      @watch(counter)
      onCounter(val: number) { fn(val); }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    document.body.removeChild(el);

    counter.set(99);
    expect(fn).not.toHaveBeenCalled();
  });

  it("works with CollectionStore", () => {
    const fn = vi.fn();
    const tag = nextTag();

    interface Item { id: string; text: string }
    const store = new CollectionStore<Item>();

    class El extends LoomElement {
      @watch(store)
      onItems(items: Item[]) { fn(items.length); }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    store.add({ text: "a" } as any);
    store.add({ text: "b" } as any);
    expect(fn).toHaveBeenLastCalledWith(2);
  });
});

describe("@watch (DI-resolved service)", () => {
  it("subscribes to a service that extends Reactive", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class CounterService extends Reactive<number> {
      constructor() { super(0); }
      increment() { this.set((n) => n + 1); }
    }

    // Register service in DI
    app.use(CounterService, new CounterService());

    class El extends LoomElement {
      @watchService(CounterService)
      onCount(val: number, prev: number) { fn(val, prev); }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    const svc = app.get<CounterService>(CounterService);
    svc.increment();
    expect(fn).toHaveBeenCalledWith(1, 0);
  });

  it("subscribes to a named property on a service", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class ThemeService {
      theme = new Reactive("light");
      toggle() {
        this.theme.set((t) => (t === "light" ? "dark" : "light"));
      }
    }

    app.use(ThemeService, new ThemeService());

    class El extends LoomElement {
      @watchService(ThemeService, "theme")
      onTheme(val: string, prev: string) { fn(val, prev); }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);

    const svc = app.get<ThemeService>(ThemeService);
    svc.toggle();
    expect(fn).toHaveBeenCalledWith("dark", "light");
  });

  it("throws when service prop is not Reactive", () => {
    const tag = nextTag();

    class BadService {
      name = "not-reactive";
    }
    app.use(BadService, new BadService());

    class El extends LoomElement {
      @watchService(BadService, "name")
      onName() {}
    }
    customElements.define(tag, El);

    const el = document.createElement(tag);
    expect(() => document.body.appendChild(el)).toThrow(
      "[loom] @watch: BadService.name is not a Reactive",
    );
  });

  it("cleans up on disconnect", () => {
    const fn = vi.fn();
    const tag = nextTag();

    class ScoreService extends Reactive<number> {
      constructor() { super(0); }
    }
    app.use(ScoreService, new ScoreService());

    class El extends LoomElement {
      @watchService(ScoreService)
      onScore(val: number) { fn(val); }
    }
    customElements.define(tag, El);

    const el = document.createElement(tag);
    document.body.appendChild(el);
    document.body.removeChild(el);

    app.get<ScoreService>(ScoreService).set(100);
    expect(fn).not.toHaveBeenCalled();
  });
});
