/**
 * Tests: Reactive<T> and CollectionStore<T>
 */
import { describe, it, expect, vi } from "vitest";
import { Reactive, CollectionStore } from "../src/store/reactive";

describe("Reactive<T>", () => {
  it("holds an initial value", () => {
    const r = new Reactive(42);
    expect(r.value).toBe(42);
  });

  it("updates value with set()", () => {
    const r = new Reactive("a");
    r.set("b");
    expect(r.value).toBe("b");
  });

  it("accepts updater function", () => {
    const r = new Reactive(10);
    r.set((prev) => prev + 5);
    expect(r.value).toBe(15);
  });

  it("notifies subscribers on change", () => {
    const r = new Reactive(0);
    const fn = vi.fn();
    r.subscribe(fn);
    r.set(1);
    expect(fn).toHaveBeenCalledWith(1, 0);
  });

  it("does not notify when value is the same", () => {
    const r = new Reactive(5);
    const fn = vi.fn();
    r.subscribe(fn);
    r.set(5);
    expect(fn).not.toHaveBeenCalled();
  });

  it("unsubscribe stops notifications", () => {
    const r = new Reactive(0);
    const fn = vi.fn();
    const unsub = r.subscribe(fn);
    unsub();
    r.set(1);
    expect(fn).not.toHaveBeenCalled();
  });

  it("watch() fires immediately with current value", () => {
    const r = new Reactive(99);
    const fn = vi.fn();
    r.watch(fn);
    expect(fn).toHaveBeenCalledWith(99, 99);
  });

  it("clear() resets value and removes storage", () => {
    const r = new Reactive(10);
    r.set(50);
    r.clear(0);
    expect(r.value).toBe(0);
  });
});

describe("CollectionStore<T>", () => {
  interface Item { id: string; name: string }
  const mkItem = (id: string, name: string): Item => ({ id, name });

  it("starts with initial items", () => {
    const store = new CollectionStore([mkItem("1", "a")]);
    expect(store.value).toHaveLength(1);
  });

  it("add() appends item and notifies", () => {
    const store = new CollectionStore<Item>([]);
    const fn = vi.fn();
    store.subscribe(fn);
    store.add(mkItem("1", "a"));
    expect(store.value).toHaveLength(1);
    expect(fn).toHaveBeenCalledOnce();
  });

  it("remove() removes item by id", () => {
    const store = new CollectionStore([mkItem("1", "a"), mkItem("2", "b")]);
    store.remove("1");
    expect(store.value).toHaveLength(1);
    expect(store.value[0].id).toBe("2");
  });

  it("update() modifies an existing item", () => {
    const store = new CollectionStore([mkItem("1", "a")]);
    store.update("1", { name: "updated" });
    expect(store.value[0].name).toBe("updated");
  });

  it("find() returns item by id", () => {
    const store = new CollectionStore([mkItem("1", "a")]);
    expect(store.find("1")).toEqual({ id: "1", name: "a" });
  });

  it("find() returns undefined for missing id", () => {
    const store = new CollectionStore<Item>([]);
    expect(store.find("nope")).toBeUndefined();
  });

  it("clear() empties the collection", () => {
    const store = new CollectionStore([mkItem("1", "a"), mkItem("2", "b")]);
    store.clear();
    expect(store.value).toHaveLength(0);
  });
});
