/**
 * View Transitions.
 *
 * happy-dom has no document.startViewTransition, so these install a fake that
 * records how it was called and controls when the callback runs -- which is
 * the part that matters. The browser's animation is not ours to test; the
 * contract we own is "mutate runs exactly once, and the post-render work
 * happens after it, not before".
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { LoomElement, component, reactive } from "../src/index";
import {
  viewTransition, startViewTransition, transitionName, supportsViewTransitions,
} from "../src/element/view-transition";

let calls: Array<{ arg: unknown; types?: string[] }> = [];
let pending: Array<() => void> = [];

/** Install a fake that defers the callback, like the real one does. */
function installVT(opts: { defer?: boolean } = {}) {
  calls = [];
  pending = [];
  (document as any).startViewTransition = (arg: any) => {
    const update = typeof arg === "function" ? arg : arg.update;
    calls.push({ arg, types: typeof arg === "function" ? undefined : arg.types });
    const run = () => update();
    if (opts.defer) pending.push(run);
    else run();
    return {
      finished: Promise.resolve(),
      updateCallbackDone: Promise.resolve(),
      skipTransition() {},
    };
  };
}

const removeVT = () => { delete (document as any).startViewTransition; };
const flushVT = () => { pending.splice(0).forEach((f) => f()); };

let tag = 0;
const nextTag = () => `vt-el-${++tag}`;

afterEach(() => {
  removeVT();
  document.body.innerHTML = "";
});

describe("startViewTransition", () => {
  it("runs the mutation through the browser API when available", () => {
    installVT();
    const mutate = vi.fn();
    startViewTransition(mutate);
    expect(calls).toHaveLength(1);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("runs the mutation directly when unsupported", () => {
    // Firefox, older Safari, and every test DOM. The DOM change must still
    // happen -- the animation is the optional part, not the update.
    expect(supportsViewTransitions()).toBe(false);
    const mutate = vi.fn();
    const handle = startViewTransition(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
    return handle.finished;
  });

  it("passes transition types through", () => {
    installVT();
    startViewTransition(() => {}, { types: ["slide"] });
    expect(calls[0]!.types).toEqual(["slide"]);
  });

  it("still mutates if the browser throws", () => {
    (document as any).startViewTransition = () => { throw new Error("nope"); };
    const mutate = vi.fn();
    startViewTransition(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("skips the transition under prefers-reduced-motion", () => {
    installVT();
    const original = globalThis.matchMedia;
    (globalThis as any).matchMedia = (q: string) => ({
      matches: q.includes("reduce"), media: q,
      addEventListener() {}, removeEventListener() {},
    });
    const mutate = vi.fn();
    startViewTransition(mutate);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(0); // never reached the browser API
    (globalThis as any).matchMedia = original;
  });

  it("honours respectReducedMotion: false", () => {
    installVT();
    const original = globalThis.matchMedia;
    (globalThis as any).matchMedia = (q: string) => ({
      matches: q.includes("reduce"), media: q,
      addEventListener() {}, removeEventListener() {},
    });
    startViewTransition(() => {}, { respectReducedMotion: false });
    expect(calls).toHaveLength(1);
    (globalThis as any).matchMedia = original;
  });
});

describe("@viewTransition", () => {
  it("wraps full renders, but not the first render", async () => {
    installVT();
    const t = nextTag();

    @component(t)
    @viewTransition
    class El extends LoomElement {
      @reactive accessor n = 0;
      update() { return <span>{String(this.n)}</span>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = document.createElement(t + "-x") as any;
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.shadowRoot.textContent).toBe("0");

    // A structural change forces the full-render path.
    el.n = 1;
    (el as LoomElement).scheduleUpdate(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(calls.length).toBeGreaterThan(0);
    expect(el.shadowRoot.textContent).toBe("1");
  });

  it("commits the morph only when the transition callback runs", async () => {
    installVT({ defer: true });
    const t = nextTag();

    @component(t)
    @viewTransition
    class El extends LoomElement {
      @reactive accessor n = 0;
      update() { return <span>{String(this.n)}</span>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = document.createElement(t + "-x") as any;
    document.body.appendChild(el);
    await Promise.resolve();
    flushVT();
    await Promise.resolve();

    el.n = 7;
    (el as LoomElement).scheduleUpdate(true);
    await Promise.resolve();
    await Promise.resolve();

    // Deferred: the browser has been asked, but the DOM has not changed yet.
    expect(calls.length).toBeGreaterThan(0);
    expect(el.shadowRoot.textContent).toBe("0");

    flushVT();
    expect(el.shadowRoot.textContent).toBe("7");
  });

  it("runs after-update hooks inside the transition, not before the morph", async () => {
    installVT({ defer: true });
    const t = nextTag();
    const seen: Array<string | null> = [];

    @component(t)
    @viewTransition
    class El extends LoomElement {
      @reactive accessor n = 0;
      update() { return <span>{String(this.n)}</span>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = document.createElement(t + "-x") as any;
    document.body.appendChild(el);
    await Promise.resolve();

    // The first render does not go through the wrapper -- it is an append
    // into an empty shadow root, with nothing to cross-fade against.
    expect(el.shadowRoot.textContent).toBe("0");

    // Records the DOM as each after-update hook sees it. If the tail ran
    // outside the wrapper it would observe the pre-morph text.
    (el as LoomElement).__afterUpdate = [
      () => seen.push(el.shadowRoot.textContent),
    ];

    el.n = 9;
    (el as LoomElement).scheduleUpdate(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(seen).toEqual([]);        // deferred: nothing has run yet
    flushVT();
    expect(seen).toEqual(["9"]);     // and it saw the post-morph DOM
  });

  it("accepts options", async () => {
    installVT();
    const t = nextTag();

    @component(t)
    @viewTransition({ types: ["slide"] })
    class El extends LoomElement {
      @reactive accessor n = 0;
      update() { return <span>{String(this.n)}</span>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = document.createElement(t + "-x") as any;
    document.body.appendChild(el);
    await Promise.resolve();
    el.n = 1;
    (el as LoomElement).scheduleUpdate(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(calls.some((c) => c.types?.includes("slide"))).toBe(true);
  });

  it("renders normally when the browser has no view transitions", async () => {
    // No installVT: the fallback path, which is most browsers today.
    const t = nextTag();

    @component(t)
    @viewTransition
    class El extends LoomElement {
      @reactive accessor n = 0;
      update() { return <span>{String(this.n)}</span>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = document.createElement(t + "-x") as any;
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.shadowRoot.textContent).toBe("0");

    el.n = 3;
    (el as LoomElement).scheduleUpdate(true);
    await Promise.resolve();
    await Promise.resolve();
    expect(el.shadowRoot.textContent).toBe("3");
  });

  it("leaves an undecorated component's render path untouched", async () => {
    installVT();
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @reactive accessor n = 0;
      update() { return <span>{String(this.n)}</span>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = document.createElement(t + "-x") as any;
    document.body.appendChild(el);
    await Promise.resolve();
    el.n = 2;
    (el as LoomElement).scheduleUpdate(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(calls).toHaveLength(0);
    expect(el.shadowRoot.textContent).toBe("2");
  });
});

describe("transitionName", () => {
  it("sets and clears the CSS property", () => {
    const el = document.createElement("div");
    transitionName(el, "card-1");
    expect(el.style.getPropertyValue("view-transition-name")).toBe("card-1");
    transitionName(el, null);
    expect(el.style.getPropertyValue("view-transition-name")).toBe("");
  });
});

describe("abort handling", () => {
  it("attaches a handler to every promise the handle exposes", async () => {
    // All three of ready/finished/updateCallbackDone reject when a transition
    // is skipped. Catching only one leaves the others unhandled, which is what
    // "Uncaught (in promise) InvalidStateError" is, and what shipped.
    //
    // Asserted by watching whether a handler was attached rather than by
    // listening for unhandledrejection: vitest does not dispatch that event,
    // so a test written that way passes whether or not the bug is present.
    const watched = () => {
      const state = { handled: false };
      return {
        state,
        thenable: {
          catch(fn: (e: unknown) => unknown) { state.handled = true; void fn; return Promise.resolve(); },
          then(a: unknown, b: unknown) { state.handled = true; void a; void b; return Promise.resolve(); },
        },
      };
    };
    const ready = watched();
    const finished = watched();
    const updateDone = watched();

    (document as any).startViewTransition = (arg: any) => {
      (typeof arg === "function" ? arg : arg.update)();
      return {
        ready: ready.thenable,
        finished: finished.thenable,
        updateCallbackDone: updateDone.thenable,
        skipTransition() {},
      };
    };

    startViewTransition(() => {});

    expect(ready.state.handled).toBe(true);
    expect(finished.state.handled).toBe(true);
    expect(updateDone.state.handled).toBe(true);
    removeVT();
  });

  it("skips a transition that is still running before starting another", () => {
    // Overlapping transitions are what produces "Transition was aborted
    // because of invalid state" when someone clicks two links quickly.
    const skips: number[] = [];
    let n = 0;
    (document as any).startViewTransition = (arg: any) => {
      const id = ++n;
      (typeof arg === "function" ? arg : arg.update)();
      return {
        ready: new Promise(() => {}),        // never settles
        finished: new Promise(() => {}),
        updateCallbackDone: Promise.resolve(),
        skipTransition() { skips.push(id); },
      };
    };

    startViewTransition(() => {});
    startViewTransition(() => {});

    expect(skips).toEqual([1]);   // the first was skipped, not left to collide
    removeVT();
  });

  it("does not start one while the document is hidden", () => {
    installVT();
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });

    const mutate = vi.fn();
    startViewTransition(mutate);

    // A hidden document cannot be snapshotted; asking throws InvalidStateError.
    expect(calls).toHaveLength(0);
    expect(mutate).toHaveBeenCalledTimes(1);   // the DOM change still happens

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });
});
