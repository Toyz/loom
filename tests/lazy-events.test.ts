/**
 * Tests: LazyLoadStart / LazyLoadEnd events
 *
 * Verifies that the @lazy decorator emits events over the global bus
 * when a module starts and finishes loading.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { lazy } from "../src/element/lazy";
import { LazyLoadStart, LazyLoadEnd } from "../src/element/lazy-events";
import { component } from "../src/element/decorators";
import { bus } from "../src/bus";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-lazy-ev-${++tagCounter}`; }

afterEach(() => cleanup());

describe("lazy loading events", () => {
  it("emits LazyLoadStart before loading and LazyLoadEnd on success", async () => {
    const tag = nextTag();
    const events: (LazyLoadStart | LazyLoadEnd)[] = [];

    const offStart = bus.on(LazyLoadStart, (e) => events.push(e));
    const offEnd = bus.on(LazyLoadEnd, (e) => events.push(e));

    class RealComponent extends LoomElement {}

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealComponent }))
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);
    await fixture(tag);
    await new Promise(r => setTimeout(r, 20));

    expect(events.length).toBe(2);

    // First event: start
    expect(events[0]).toBeInstanceOf(LazyLoadStart);
    expect((events[0] as LazyLoadStart).tag).toBe(tag);

    // Second event: end with success
    expect(events[1]).toBeInstanceOf(LazyLoadEnd);
    const end = events[1] as LazyLoadEnd;
    expect(end.tag).toBe(tag);
    expect(end.success).toBe(true);
    expect(end.duration).toBeGreaterThanOrEqual(0);
    expect(end.error).toBeUndefined();

    offStart();
    offEnd();
  });

  it("emits LazyLoadEnd with success=false on load failure", async () => {
    const tag = nextTag();
    const events: LazyLoadEnd[] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const offEnd = bus.on(LazyLoadEnd, (e) => events.push(e));

    @component(tag)
    @lazy(() => Promise.reject(new Error("network fail")))
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);
    await fixture(tag);
    await new Promise(r => setTimeout(r, 20));

    expect(events.length).toBe(1);
    expect(events[0].tag).toBe(tag);
    expect(events[0].success).toBe(false);
    expect(events[0].duration).toBeGreaterThanOrEqual(0);
    expect(events[0].error).toBeInstanceOf(Error);
    expect((events[0].error as Error).message).toBe("network fail");

    offEnd();
    consoleError.mockRestore();
  });

  it("does not emit events on cached re-mount", async () => {
    const tag = nextTag();
    let eventCount = 0;

    class RealComponent extends LoomElement {}

    @component(tag)
    @lazy(() => Promise.resolve({ default: RealComponent }))
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);

    // First mount — should emit
    await fixture(tag);
    await new Promise(r => setTimeout(r, 20));

    const off = bus.on(LazyLoadStart, () => eventCount++);

    // Second mount — module already cached, should NOT emit
    cleanup();
    await fixture(tag);
    await new Promise(r => setTimeout(r, 20));

    expect(eventCount).toBe(0);

    off();
  });

  it("includes duration that reflects load time", async () => {
    const tag = nextTag();
    let captured: LazyLoadEnd | null = null;

    const offEnd = bus.on(LazyLoadEnd, (e) => { captured = e; });

    class RealComponent extends LoomElement {}

    @component(tag)
    @lazy(() => new Promise(r => setTimeout(() => r({ default: RealComponent }), 50)))
    class StubComponent extends LoomElement {}

    customElements.define(tag, StubComponent);
    await fixture(tag);
    await new Promise(r => setTimeout(r, 100));

    expect(captured).toBeTruthy();
    expect(captured!.duration).toBeGreaterThanOrEqual(40); // allow slight timing variance

    offEnd();
  });
});
