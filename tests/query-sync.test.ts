/**
 * Two-way `@prop({ query, sync })`.
 *
 * The binding was URL -> property only. Setting the property re-rendered the
 * component and left the address bar behind, so the URL stopped describing the
 * view: refresh, share and bookmark lost the state, and Back did not undo a
 * filter change.
 *
 * These drive the seam directly (src/query-sync.ts) rather than standing up a
 * router, because what is under test is the accessor's decision to write and
 * what it writes -- the router's own URL handling has its own tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prop } from "../src/store/decorators";
import { setQueryWriter, duringRouteSync } from "../src/query-sync";

type Write = { key: string; value: string | null; history: string };
let writes: Write[];

beforeEach(() => {
  writes = [];
  setQueryWriter((key, value, history) => writes.push({ key, value, history }));
});
afterEach(() => setQueryWriter(null));

describe("@prop({ query, sync })", () => {
  it("writes the key when the property changes", () => {
    class Page {
      @prop({ query: "type", sync: true }) accessor filter = "all";
    }
    const p = new Page();
    p.filter = "animated";

    expect(writes).toEqual([{ key: "type", value: "animated", history: "replace" }]);
  });

  it("removes the key when the value returns to its declared default", () => {
    // A pristine view should have a pristine URL -- ?type=all says nothing.
    class Page {
      @prop({ query: "type", sync: true }) accessor filter = "all";
    }
    const p = new Page();
    p.filter = "animated";
    p.filter = "all";

    expect(writes.map((w) => w.value)).toEqual(["animated", null]);
  });

  it("keeps the default when includeDefault is set", () => {
    class Page {
      @prop({ query: "page", sync: { includeDefault: true } }) accessor page = 1;
    }
    const p = new Page();
    p.page = 1;
    expect(writes).toEqual([{ key: "page", value: "1", history: "replace" }]);
  });

  it("pushes a history entry when asked", () => {
    // Pagination is the case where Back should step back a page.
    class Page {
      @prop({ query: "page", sync: { history: "push" } }) accessor page = 1;
    }
    const p = new Page();
    p.page = 2;
    expect(writes[0]!.history).toBe("push");
  });

  it("debounces, so a text input is one history entry and not one per key", () => {
    vi.useFakeTimers();
    class Page {
      @prop({ query: "q", sync: { debounce: 300 } }) accessor query = "";
    }
    const p = new Page();
    for (const s of ["l", "lo", "loo", "loom"]) p.query = s;

    expect(writes).toHaveLength(0);
    vi.advanceTimersByTime(300);
    expect(writes).toEqual([{ key: "q", value: "loom", history: "replace" }]);
    vi.useRealTimers();
  });

  it("does not echo a value the router just injected", () => {
    // The outlet assigns straight onto the property during resolution. Writing
    // that back would have the prop fighting the navigation that set it.
    class Page {
      @prop({ query: "type", sync: true }) accessor filter = "all";
    }
    const p = new Page();
    duringRouteSync(() => { p.filter = "animated"; });

    expect(writes).toEqual([]);
    expect(p.filter).toBe("animated");
  });

  it("leaves an unsynced query prop one-way", () => {
    class Page {
      @prop({ query: "type" }) accessor filter = "all";
    }
    const p = new Page();
    p.filter = "animated";

    expect(writes).toEqual([]);   // opt-in; existing code is unchanged
  });

  it("does nothing when no router is mounted", () => {
    setQueryWriter(null);
    class Page {
      @prop({ query: "type", sync: true }) accessor filter = "all";
    }
    const p = new Page();
    expect(() => { p.filter = "x"; }).not.toThrow();
  });

  it("tracks each instance's own default", () => {
    class Page {
      @prop({ query: "type", sync: true }) accessor filter = "all";
    }
    const a = new Page();
    const b = new Page();
    a.filter = "animated";
    b.filter = "all";   // already the default for b

    expect(writes.map((w) => w.value)).toEqual(["animated", null]);
  });
});

describe("empty values leave no key behind", () => {
  it("removes the key when a synced prop is cleared to an empty string", () => {
    class Page {
      @prop({ query: "q", sync: true }) accessor query = "start";
    }
    const p = new Page();
    p.query = "";
    // `?q=` is not state. It reads back as "", writes back as "", and sits in
    // the URL looking like something was set.
    expect(writes).toEqual([{ key: "q", value: null, history: "replace" }]);
  });

  it("removes it for null and undefined too", () => {
    class Page {
      @prop({ query: "color", sync: true }) accessor color: string | null = "red";
    }
    const p = new Page();
    p.color = null;
    expect(writes.at(-1)!.value).toBeNull();
  });

  it("still removes when includeDefault is on", () => {
    // includeDefault is about writing a *default*, not about writing nothing.
    class Page {
      @prop({ query: "q", sync: { includeDefault: true } }) accessor query = "x";
    }
    const p = new Page();
    p.query = "";
    expect(writes.at(-1)!.value).toBeNull();
  });
});
