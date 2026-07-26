/**
 * @watch(Service, "field") against an @reactive field on a DI service.
 *
 * This is the form the DI docs describe, and it threw. A field declared
 * `@reactive accessor count = 0` reads back as a plain number — the Reactive
 * lives on a symbol the accessor closes over — so the `subscribe` check found
 * nothing and raised "is not a Reactive". Only a field holding a literal
 * `new Reactive()` ever worked.
 *
 * Everything is declared at module scope and started once: app.start() is
 * one-shot, so a @service registered after it is never constructed.
 */
import { describe, it, expect } from "vitest";
import { LoomElement, component, reactive, app } from "../src/index";
import { service } from "../src/di/index";
import { watch } from "../src/store/watch";
import { Reactive } from "../src/store/reactive";
import { store } from "../src/store/decorators";

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

@service()
class Counter {
  @reactive accessor count = 0;
}

@service()
class Holder {
  readonly total = new Reactive(0);
}

@service()
class Settings {
  @store accessor prefs = { theme: "dark" };
}

@service()
class Plain {
  count = 0;
}

const seenCount: number[] = [];
const seenTotal: number[] = [];
const seenPrefs: unknown[] = [];

@component("watch-svc-a")
class HostA extends LoomElement {
  @watch(Counter, "count")
  onCount(v: number) { seenCount.push(v); }
  update() { return document.createTextNode("x"); }
}

@component("watch-svc-b")
class HostB extends LoomElement {
  @watch(Holder, "total")
  onTotal(v: number) { seenTotal.push(v); }
  update() { return document.createTextNode("x"); }
}

@component("watch-svc-c")
class HostC extends LoomElement {
  @watch(Settings, "prefs")
  onPrefs(v: unknown) { seenPrefs.push(v); }
  update() { return document.createTextNode("x"); }
}

@component("watch-svc-d")
class HostD extends LoomElement {
  @watch(Plain, "count")
  onCount() {}
  update() { return document.createTextNode("x"); }
}

app.start();

describe("@watch(Service, prop)", () => {
  it("watches an @reactive accessor on a service", async () => {
    const el = document.createElement("watch-svc-a") as HostA;
    document.body.appendChild(el);
    await tick();

    app.get(Counter).count = 5;
    await tick();
    app.get(Counter).count = 6;
    await tick();

    expect(seenCount).toEqual([5, 6]);
    el.remove();
  });

  it("still watches a field holding a Reactive instance", async () => {
    const el = document.createElement("watch-svc-b") as HostB;
    document.body.appendChild(el);
    await tick();

    app.get(Holder).total.set(3);
    await tick();
    expect(seenTotal).toEqual([3]);
    el.remove();
  });

  it("watches an @store field on a service", async () => {
    const el = document.createElement("watch-svc-c") as HostC;
    document.body.appendChild(el);
    await tick();

    app.get(Settings).prefs.theme = "light";
    await tick();
    expect(seenPrefs.length).toBeGreaterThan(0);
    el.remove();
  });

  it("names the field in the error when it really is not reactive", () => {
    const el = document.createElement("watch-svc-d") as HostD;
    expect(() => document.body.appendChild(el)).toThrow(/Plain\.count is not reactive/);
    el.remove();
  });
});
