/**
 * @visible / @online, and the query layer's awareness of them.
 *
 * happy-dom has document.visibilityState and navigator.onLine but does not
 * let you change them, so these redefine the properties and dispatch the
 * matching event -- which is exactly what the browser does.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { LoomElement, component } from "../src/index";
import { visible, online } from "../src/element/environment";
import { isVisible, isOnline, onVisibilityChange } from "../src/env";
import { createApiState } from "../src/query/state";

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", { value: hidden, configurable: true });
  Object.defineProperty(document, "visibilityState", {
    value: hidden ? "hidden" : "visible", configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function setOnline(on: boolean) {
  Object.defineProperty(navigator, "onLine", { value: on, configurable: true });
  window.dispatchEvent(new Event(on ? "online" : "offline"));
}

let tag = 0;
const nextTag = () => `env-el-${++tag}`;

afterEach(() => {
  setHidden(false);
  setOnline(true);
  document.body.innerHTML = "";
});

describe("environment signals", () => {
  it("reads visibility and online state", () => {
    expect(isVisible()).toBe(true);
    setHidden(true);
    expect(isVisible()).toBe(false);
    setHidden(false);

    expect(isOnline()).toBe(true);
    setOnline(false);
    expect(isOnline()).toBe(false);
  });

  it("shares one listener and detaches when the last subscriber leaves", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");

    const a = onVisibilityChange(() => {});
    const b = onVisibilityChange(() => {});
    // Two subscribers, one DOM listener -- the point of the shared signal.
    expect(add.mock.calls.filter((c) => c[0] === "visibilitychange")).toHaveLength(1);

    a();
    expect(remove.mock.calls.filter((c) => c[0] === "visibilitychange")).toHaveLength(0);
    b();
    expect(remove.mock.calls.filter((c) => c[0] === "visibilitychange")).toHaveLength(1);

    add.mockRestore();
    remove.mockRestore();
  });

  it("a throwing subscriber does not stop the others", () => {
    const seen: string[] = [];
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const a = onVisibilityChange(() => { throw new Error("boom"); });
    const b = onVisibilityChange(() => seen.push("b"));

    setHidden(true);
    expect(seen).toEqual(["b"]);

    a(); b(); err.mockRestore();
  });
});

describe("@visible / @online", () => {
  it("reflects visibility and re-renders", async () => {
    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @visible accessor shown = true;
      update() { return <span>{this.shown ? "on" : "off"}</span>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = document.createElement(t + "-x") as any;
    document.body.appendChild(el);
    await tick();
    expect(el.shadowRoot.textContent).toBe("on");

    setHidden(true);
    await tick();
    expect(el.shown).toBe(false);
    expect(el.shadowRoot.textContent).toBe("off");

    setHidden(false);
    await tick();
    expect(el.shadowRoot.textContent).toBe("on");
  });

  it("reflects online state", async () => {
    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @online accessor net = true;
      update() { return <span>{this.net ? "up" : "down"}</span>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = document.createElement(t + "-x") as any;
    document.body.appendChild(el);
    await tick();
    expect(el.shadowRoot.textContent).toBe("up");

    setOnline(false);
    await tick();
    expect(el.shadowRoot.textContent).toBe("down");
  });

  it("unsubscribes on disconnect", async () => {
    const t = nextTag();
    @component(t)
    class El extends LoomElement {
      @visible accessor shown = true;
      update() { return <span>x</span>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = document.createElement(t + "-x") as any;
    document.body.appendChild(el);
    await tick();
    el.remove();
    await tick();

    // Would throw or warn if the detached element were still being updated.
    expect(() => setHidden(true)).not.toThrow();
  });
});

describe("query pauses while hidden", () => {
  it("defers stale revalidation until the page is visible again", async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });

    const s = createApiState<{ v: number }>({ fn, staleTime: 10 }, () => {}, {});
    await tick(20);
    expect(s.data).toEqual({ v: 1 });

    setHidden(true);
    void s.stale;              // trips checkStale while hidden
    await tick(20);
    // A background tab must not spend a request to refresh pixels nobody
    // is looking at.
    expect(fn).toHaveBeenCalledTimes(1);

    setHidden(false);
    await tick(20);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(s.data).toEqual({ v: 2 });
  });

  it("revalidates immediately while visible", async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });

    const s = createApiState<{ v: number }>({ fn, staleTime: 10 }, () => {}, {});
    await tick(20);
    void s.stale;
    await tick(20);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("honours pauseWhenHidden: false", async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });

    const s = createApiState<{ v: number }>(
      { fn, staleTime: 10, pauseWhenHidden: false }, () => {}, {},
    );
    await tick(20);
    setHidden(true);
    void s.stale;
    await tick(20);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("dispose removes the pending visibility listener", async () => {
    const fn = vi.fn().mockResolvedValue({ v: 1 });
    const s = createApiState<{ v: number }>({ fn, staleTime: 10 }, () => {}, {});
    await tick(20);

    setHidden(true);
    void s.stale;
    await tick(5);
    s.dispose?.();

    setHidden(false);
    await tick(20);
    // Disposed: coming back must not resurrect a fetch for a dead state.
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
