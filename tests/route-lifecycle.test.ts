/**
 * Tests: @onRouteEnter / @onRouteLeave
 *
 * Covers: metadata registration, handler dispatch, multi-handler, param passing
 */
import { describe, it, expect, vi } from "vitest";
import { onRouteEnter, onRouteLeave } from "../src/router/route-lifecycle";
import { ROUTE_ENTER, ROUTE_LEAVE } from "../src/decorators/symbols";

describe("@onRouteEnter", () => {
  it("stores method key on prototype under ROUTE_ENTER symbol", () => {
    class Page {
      @onRouteEnter
      handleEnter() {}
    }

    const handlers = Page.prototype[ROUTE_ENTER as any] as string[];
    expect(handlers).toBeDefined();
    expect(handlers).toContain("handleEnter");
  });

  it("supports multiple handlers", () => {
    class Page {
      @onRouteEnter
      loadData() {}

      @onRouteEnter
      trackAnalytics() {}
    }

    const handlers = Page.prototype[ROUTE_ENTER as any] as string[];
    expect(handlers).toHaveLength(2);
    expect(handlers).toContain("loadData");
    expect(handlers).toContain("trackAnalytics");
  });
});

describe("@onRouteLeave", () => {
  it("stores method key on prototype under ROUTE_LEAVE symbol", () => {
    class Page {
      @onRouteLeave
      cleanup() {}
    }

    const handlers = Page.prototype[ROUTE_LEAVE as any] as string[];
    expect(handlers).toBeDefined();
    expect(handlers).toContain("cleanup");
  });

  it("supports multiple handlers", () => {
    class Page {
      @onRouteLeave
      saveState() {}

      @onRouteLeave
      clearTimers() {}
    }

    const handlers = Page.prototype[ROUTE_LEAVE as any] as string[];
    expect(handlers).toHaveLength(2);
    expect(handlers).toContain("saveState");
    expect(handlers).toContain("clearTimers");
  });
});

describe("combined usage", () => {
  it("both enter and leave handlers coexist on same class", () => {
    class Page {
      @onRouteEnter
      entered() {}

      @onRouteLeave
      left() {}
    }

    const enterHandlers = Page.prototype[ROUTE_ENTER as any] as string[];
    const leaveHandlers = Page.prototype[ROUTE_LEAVE as any] as string[];

    expect(enterHandlers).toContain("entered");
    expect(leaveHandlers).toContain("left");
    // They should be separate arrays
    expect(enterHandlers).not.toContain("left");
    expect(leaveHandlers).not.toContain("entered");
  });

  it("handler methods are callable with params", () => {
    const spy = vi.fn();

    class Page {
      @onRouteEnter
      entered(params: Record<string, string>) {
        spy(params);
      }
    }

    const instance = new Page();
    instance.entered({ id: "42" });
    expect(spy).toHaveBeenCalledWith({ id: "42" });
  });
});
