/**
 * Tests: Storage adapters — LocalAdapter, SessionAdapter, MemoryStorage
 *
 * Note: happy-dom does not fully implement Web Storage (localStorage/sessionStorage).
 * LocalAdapter silently catches errors — we can only verify it doesn't throw.
 * SessionAdapter has the same limitation. MemoryStorage is fully testable.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryStorage, LocalAdapter, SessionAdapter } from "../src/store/storage";

describe("MemoryStorage", () => {
  let store: MemoryStorage;

  beforeEach(() => {
    store = new MemoryStorage();
  });

  it("set / get round-trips", () => {
    store.set("key", "val");
    expect(store.get("key")).toBe("val");
  });

  it("get returns null for missing key", () => {
    expect(store.get("missing")).toBeNull();
  });

  it("remove deletes key", () => {
    store.set("key", "val");
    store.remove("key");
    expect(store.get("key")).toBeNull();
  });

  it("supports overwriting", () => {
    store.set("key", "old");
    store.set("key", "new");
    expect(store.get("key")).toBe("new");
  });

  it("removes only the targeted key", () => {
    store.set("a", "1");
    store.set("b", "2");
    store.remove("a");
    expect(store.get("a")).toBeNull();
    expect(store.get("b")).toBe("2");
  });
});

describe("LocalAdapter", () => {
  it("does not throw on set/get/remove", () => {
    const med = new LocalAdapter();
    // happy-dom's localStorage may not work, but our wrapper
    // catches errors silently — verify no exceptions escape
    expect(() => med.set("k", "v")).not.toThrow();
    expect(() => med.get("k")).not.toThrow();
    expect(() => med.remove("k")).not.toThrow();
  });

  it("get returns null for missing key", () => {
    const med = new LocalAdapter();
    expect(med.get("loom_test_missing_key")).toBeNull();
  });
});

describe("SessionAdapter", () => {
  it("does not throw on set/get/remove", () => {
    const med = new SessionAdapter();
    expect(() => med.set("k", "v")).not.toThrow();
    expect(() => med.get("k")).not.toThrow();
    expect(() => med.remove("k")).not.toThrow();
  });

  it("get returns null for missing key", () => {
    const med = new SessionAdapter();
    expect(med.get("loom_test_missing_key")).toBeNull();
  });
});
