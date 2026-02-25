/**
 * Tests: EventBus — emit / on / off / clear / reset
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventBus, bus as globalBus } from "../src/bus";
import { LoomEvent } from "../src/event";

class TestEvent extends LoomEvent {
  constructor(public value: string) { super(); }
}
class OtherEvent extends LoomEvent {
  constructor(public n: number) { super(); }
}

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it("calls listener when matching event is emitted", () => {
    const fn = vi.fn();
    bus.on(TestEvent, fn);
    const ev = new TestEvent("hello");
    bus.emit(ev);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(ev);
  });

  it("does not call listener for different event types", () => {
    const fn = vi.fn();
    bus.on(TestEvent, fn);
    bus.emit(new OtherEvent(42));
    expect(fn).not.toHaveBeenCalled();
  });

  it("supports multiple listeners for the same event", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    bus.on(TestEvent, fn1);
    bus.on(TestEvent, fn2);
    bus.emit(new TestEvent("x"));
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it("returns unsubscribe function from on()", () => {
    const fn = vi.fn();
    const unsub = bus.on(TestEvent, fn);
    unsub();
    bus.emit(new TestEvent("x"));
    expect(fn).not.toHaveBeenCalled();
  });

  it("off() removes a specific listener", () => {
    const fn = vi.fn();
    bus.on(TestEvent, fn);
    bus.off(TestEvent, fn);
    bus.emit(new TestEvent("x"));
    expect(fn).not.toHaveBeenCalled();
  });

  it("clear() removes all listeners for an event type", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    bus.on(TestEvent, fn1);
    bus.on(TestEvent, fn2);
    bus.clear(TestEvent);
    bus.emit(new TestEvent("x"));
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it("reset() removes all listeners for all events", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    bus.on(TestEvent, fn1);
    bus.on(OtherEvent, fn2);
    bus.reset();
    bus.emit(new TestEvent("x"));
    bus.emit(new OtherEvent(1));
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });
});

// ── LoomEvent.dispatch() ──

describe("LoomEvent.dispatch()", () => {

  it("emits through the global bus", () => {
    const fn = vi.fn();
    globalBus.on(TestEvent, fn);
    TestEvent.dispatch("dispatched");
    expect(fn).toHaveBeenCalledOnce();
    globalBus.reset();
  });

  it("passes constructor args to the event instance", () => {
    const fn = vi.fn();
    globalBus.on(TestEvent, fn);
    TestEvent.dispatch("hello");
    const received = fn.mock.calls[0][0] as TestEvent;
    expect(received.value).toBe("hello");
    expect(received).toBeInstanceOf(TestEvent);
    globalBus.reset();
  });

  it("auto-stamps timestamp", () => {
    const fn = vi.fn();
    globalBus.on(TestEvent, fn);
    const before = Date.now();
    TestEvent.dispatch("ts");
    const received = fn.mock.calls[0][0] as TestEvent;
    expect(received.timestamp).toBeGreaterThanOrEqual(before);
    expect(received.timestamp).toBeLessThanOrEqual(Date.now());
    globalBus.reset();
  });

  it("works with different event types", () => {
    const fn = vi.fn();
    globalBus.on(OtherEvent, fn);
    OtherEvent.dispatch(42);
    const received = fn.mock.calls[0][0] as OtherEvent;
    expect(received.n).toBe(42);
    globalBus.reset();
  });

  it("does not cross-fire between event types", () => {
    const fn = vi.fn();
    globalBus.on(TestEvent, fn);
    OtherEvent.dispatch(99);
    expect(fn).not.toHaveBeenCalled();
    globalBus.reset();
  });
});
