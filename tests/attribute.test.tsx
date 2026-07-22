/**
 * Tests: LoomAttribute — custom attribute controllers (directives)
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomAttribute, attribute, observeAttributes, LoomElement, component, interval, observer, styles, query, mount, unmount } from "../src/element";
import { css } from "../src/css";
import { prop } from "../src/store";
import { on } from "../src/decorators";
import { app } from "../src/app";
import { cleanup, fixture } from "../src/testing";

afterEach(() => cleanup());

/** MutationObserver fires on a microtask; flush a few plus a macrotask. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise<void>((r) => queueMicrotask(r));
  await new Promise<void>((r) => setTimeout(r, 0));
}

describe("LoomAttribute", () => {
  it("connects, updates, and disconnects on a light-DOM root", async () => {
    const connectSpy = vi.fn();
    const changeSpy = vi.fn();
    const disconnectSpy = vi.fn();

    @attribute("data-tooltip")
    class Tooltip extends LoomAttribute {
      connect() {
        connectSpy(this.value);
        this.el.classList.add("tooltip");
        this.el.setAttribute("aria-label", this.value);
      }
      valueChanged(old: string, next: string) {
        changeSpy(old, next);
        this.el.setAttribute("aria-label", next);
      }
      disconnect() {
        disconnectSpy();
        this.el.classList.remove("tooltip");
      }
    }
    void Tooltip;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const stop = observeAttributes(host);

    // Add an element carrying the attribute.
    const btn = document.createElement("button");
    btn.setAttribute("data-tooltip", "Save");
    host.appendChild(btn);
    await flush();

    expect(connectSpy).toHaveBeenCalledWith("Save");
    expect(btn.classList.contains("tooltip")).toBe(true);
    expect(btn.getAttribute("aria-label")).toBe("Save");

    // Patch the value.
    btn.setAttribute("data-tooltip", "Submit");
    await flush();
    expect(changeSpy).toHaveBeenCalledWith("Save", "Submit");
    expect(btn.getAttribute("aria-label")).toBe("Submit");

    // Remove the attribute → disconnect.
    btn.removeAttribute("data-tooltip");
    await flush();
    expect(disconnectSpy).toHaveBeenCalledOnce();
    expect(btn.classList.contains("tooltip")).toBe(false);

    stop();
    document.body.removeChild(host);
  });

  it("disconnects when the element leaves the DOM", async () => {
    const disconnectSpy = vi.fn();

    @attribute("data-flag")
    class Flag extends LoomAttribute {
      disconnect() { disconnectSpy(); }
    }
    void Flag;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const stop = observeAttributes(host);

    const el = document.createElement("span");
    el.setAttribute("data-flag", "x");
    host.appendChild(el);
    await flush();

    host.removeChild(el);
    await flush();
    expect(disconnectSpy).toHaveBeenCalledOnce();

    stop();
    document.body.removeChild(host);
  });

  it("auto-observes document.body — controllers work outside any Loom shadow", async () => {
    // Regression: modals / toasts / portals / top-level HTML live under
    // document.body, not inside a component shadow root. Registering an
    // @attribute must auto-observe the document so these attach without a
    // manual observeAttributes() call.
    const spy = vi.fn();

    @attribute("auto-body")
    class AutoBody extends LoomAttribute {
      connect() { spy("connect"); }
      disconnect() { spy("disconnect"); }
    }
    void AutoBody;

    // No observeAttributes() call — appended straight to body, like a portal.
    const modal = document.createElement("div");
    modal.setAttribute("auto-body", "x");
    document.body.appendChild(modal);
    await flush();
    expect(spy).toHaveBeenCalledWith("connect");

    modal.remove();
    await flush();
    expect(spy).toHaveBeenCalledWith("disconnect");
  });

  it("scans elements already present when observation starts", async () => {
    const connectSpy = vi.fn();

    @attribute("data-preexisting")
    class Pre extends LoomAttribute {
      connect() { connectSpy(); }
    }
    void Pre;

    const host = document.createElement("div");
    host.innerHTML = `<p data-preexisting="y">hi</p>`;
    document.body.appendChild(host);

    const stop = observeAttributes(host);
    // Initial scan is synchronous.
    expect(connectSpy).toHaveBeenCalledOnce();

    stop();
    document.body.removeChild(host);
  });

  it("supports CONNECT_HOOKS decorators (@interval) on controllers", async () => {
    vi.useFakeTimers();
    const tick = vi.fn();

    @attribute("data-ticker")
    class Ticker extends LoomAttribute {
      @interval(100)
      onTick() { tick(); }
    }
    void Ticker;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const stop = observeAttributes(host);

    const el = document.createElement("div");
    el.setAttribute("data-ticker", "");
    host.appendChild(el);
    // MutationObserver won't fire under fake timers via microtask alone here;
    // scan synchronously by re-observing (idempotent) instead.
    observeAttributes(host);

    vi.advanceTimersByTime(350);
    expect(tick).toHaveBeenCalledTimes(3);

    // Removal clears the interval (no throw, no further ticks).
    host.removeChild(el);
    observeAttributes(host); // triggers dispose scan path is childList-based;
    stop();
    vi.useRealTimers();
    document.body.removeChild(host);
  });

  it("passes rich JSX values as this.arg (intersect={fn}, bare, string)", async () => {
    const seen: { name: string; arg: unknown; value: string }[] = [];

    @attribute("intersect")
    class Intersect extends LoomAttribute<() => void> {
      connect() { seen.push({ name: this.name, arg: this.arg, value: this.value }); }
    }
    @attribute("sticky")
    class Sticky extends LoomAttribute<boolean> {
      connect() { seen.push({ name: this.name, arg: this.arg, value: this.value }); }
    }
    @attribute("shortcut")
    class Shortcut extends LoomAttribute {
      connect() { seen.push({ name: this.name, arg: this.arg, value: this.value }); }
    }
    void Intersect; void Sticky; void Shortcut;

    const load = () => {};

    @component("bridge-host")
    class BridgeHost extends LoomElement {
      update() {
        // JSX bridge: <div sticky intersect={load} shortcut="j" />
        return (<div sticky intersect={load} shortcut="j" />) as unknown as HTMLElement;
      }
    }
    void BridgeHost;

    await app.start();
    await fixture<BridgeHost>("bridge-host");
    await flush();

    const intersect = seen.find((s) => s.name === "intersect");
    const sticky = seen.find((s) => s.name === "sticky");
    const shortcut = seen.find((s) => s.name === "shortcut");
    expect(intersect?.arg).toBe(load);       // the function itself
    expect(intersect?.value).toBe("");        // marker attribute
    expect(sticky?.arg).toBe(true);           // bare boolean
    expect(shortcut?.arg).toBe("j");          // string → arg === value
    expect(shortcut?.value).toBe("j");
  });

  it("@observer targets this.el on a controller (no hand-rolled IO)", async () => {
    const observed: Element[] = [];
    const hits: unknown[] = [];
    // Stub IntersectionObserver to capture the observed target + fire once.
    const realIO = globalThis.IntersectionObserver;
    class FakeIO {
      cb: (entries: any[]) => void;
      constructor(cb: (entries: any[]) => void) { this.cb = cb; }
      observe(el: Element) { observed.push(el); this.cb([{ isIntersecting: true, target: el }]); }
      disconnect() {}
      unobserve() {}
      takeRecords() { return []; }
    }
    (globalThis as any).IntersectionObserver = FakeIO;

    @attribute("intersect")
    class Intersect extends LoomAttribute<() => void> {
      @observer("intersection")
      onVisible(e: IntersectionObserverEntry) { if (e.isIntersecting) { hits.push(e.target); this.arg(); } }
    }
    void Intersect;

    const load = vi.fn();
    const host = document.createElement("div");
    document.body.appendChild(host);
    observeAttributes(host);

    const el = document.createElement("div");
    el.setAttribute("intersect", "");
    (el as any).__loomAttrArgs = { intersect: load };
    host.appendChild(el);
    await flush();

    expect(observed).toContain(el);   // observed the host element, not the controller
    expect(load).toHaveBeenCalledOnce();

    (globalThis as any).IntersectionObserver = realIO;
    document.body.removeChild(host);
  });

  it("spreads object args onto @prop fields", async () => {
    let captured: { text: string; placement: string } | null = null;

    @attribute("tip")
    class Tip extends LoomAttribute {
      @prop accessor text = "";
      @prop accessor placement = "top";
      connect() { captured = { text: this.text, placement: this.placement }; }
    }
    void Tip;

    const host = document.createElement("div");
    document.body.appendChild(host);
    observeAttributes(host);

    const el = document.createElement("div");
    el.setAttribute("tip", "");
    (el as any).__loomAttrArgs = { tip: { text: "Save", placement: "bottom" } };
    host.appendChild(el);
    await flush();

    expect(captured).toEqual({ text: "Save", placement: "bottom" });
    document.body.removeChild(host);
  });

  it("renders update() JSX into a portal target and reacts", async () => {
    @attribute("bubble")
    class Bubble extends LoomAttribute {
      @prop accessor text = "";
      update() { return (<div class="bubble">{this.text}</div>) as unknown as HTMLElement; }
    }
    void Bubble;

    const host = document.createElement("div");
    document.body.appendChild(host);
    observeAttributes(host);

    const el = document.createElement("span");
    el.setAttribute("bubble", "");
    (el as any).__loomAttrArgs = { bubble: { text: "hi" } };
    host.appendChild(el);
    await flush();

    const hostDiv = document.body.querySelector('[data-loom-attr="bubble"]');
    const mounted = hostDiv?.shadowRoot?.querySelector(".bubble");
    expect(mounted?.textContent).toBe("hi");
    document.body.removeChild(host);
  });

  it("resolves portal target: option and runtime `to` prop", async () => {
    const optRoot = document.createElement("div"); optRoot.id = "opt-root";
    const toRoot = document.createElement("div"); toRoot.id = "to-root";
    document.body.append(optRoot, toRoot);

    @attribute("opt-portal", { target: "#opt-root" })
    class OptPortal extends LoomAttribute {
      update() { return (<div class="opt">x</div>) as unknown as HTMLElement; }
    }
    @attribute("to-portal")
    class ToPortal extends LoomAttribute {
      update() { return (<div class="to">y</div>) as unknown as HTMLElement; }
    }
    void OptPortal; void ToPortal;

    const host = document.createElement("div");
    document.body.appendChild(host);
    observeAttributes(host);

    const a = document.createElement("span");
    a.setAttribute("opt-portal", "");
    host.appendChild(a);

    const b = document.createElement("span");
    b.setAttribute("to-portal", "");
    (b as any).__loomAttrArgs = { "to-portal": { to: "#to-root" } };
    host.appendChild(b);
    await flush();

    const optContent = optRoot.querySelector('[data-loom-attr="opt-portal"]')?.shadowRoot?.querySelector(".opt");
    const toContent = toRoot.querySelector('[data-loom-attr="to-portal"]')?.shadowRoot?.querySelector(".to");
    expect(optContent).toBeTruthy();  // @attribute option
    expect(toContent).toBeTruthy();   // runtime `to` prop
    document.body.removeChild(host);
    optRoot.remove(); toRoot.remove();
  });

  it("@styles and @query work on a rendering controller (shadow parity)", async () => {
    const sheet = css`.card { color: rgb(1, 2, 3); }`;

    @attribute("card")
    @styles(sheet)
    class Card extends LoomAttribute {
      @query(".card") accessor card!: HTMLDivElement;
      seen = "";
      update() { return (<div class="card">hello</div>) as unknown as HTMLElement; }
      connect() {
        // @query resolves against the render shadow root after first render.
        queueMicrotask(() => { this.seen = this.card?.textContent ?? "MISS"; });
      }
    }
    void Card;

    const host = document.createElement("div");
    document.body.appendChild(host);
    observeAttributes(host);

    const el = document.createElement("span");
    el.setAttribute("card", "");
    host.appendChild(el);
    await flush();

    const shadow = document.body.querySelector('[data-loom-attr="card"]')?.shadowRoot;
    expect(shadow?.querySelector(".card")?.textContent).toBe("hello");
    // @styles adopted the sheet into the render shadow root.
    expect(shadow?.adoptedStyleSheets).toContain(sheet);
    document.body.removeChild(host);
  });

  it("@mount and @unmount fire on connect / removal", async () => {
    const log: string[] = [];

    @attribute("mounty")
    class Mounty extends LoomAttribute {
      @mount onMount() { log.push("mount"); }
      @unmount onUnmount() { log.push("unmount"); }
    }
    void Mounty;

    const host = document.createElement("div");
    document.body.appendChild(host);
    observeAttributes(host);

    const el = document.createElement("div");
    el.setAttribute("mounty", "");
    host.appendChild(el);
    await flush();
    expect(log).toEqual(["mount"]);

    host.removeChild(el);
    await flush();
    expect(log).toEqual(["mount", "unmount"]);
    document.body.removeChild(host);
  });

  it("@on('click') listens on the host element of a controller", async () => {
    const hits: string[] = [];

    @attribute("clicky")
    class Clicky extends LoomAttribute {
      @on("click") onClick() { hits.push("click"); }
    }
    void Clicky;

    const host = document.createElement("div");
    document.body.appendChild(host);
    observeAttributes(host);

    const btn = document.createElement("button");
    btn.setAttribute("clicky", "");
    host.appendChild(btn);
    await flush();

    btn.dispatchEvent(new Event("click"));
    expect(hits).toEqual(["click"]);

    // Cleanup on removal — no further hits.
    host.removeChild(btn);
    await flush();
    btn.dispatchEvent(new Event("click"));
    expect(hits).toEqual(["click"]);
    document.body.removeChild(host);
  });

  it("@on('click') still binds to self on a LoomElement (no regression)", async () => {
    const hits: string[] = [];

    @component("on-self-host")
    class OnSelf extends LoomElement {
      @on("click") onClick() { hits.push("self"); }
      update() { return document.createElement("div"); }
    }
    void OnSelf;

    await app.start();
    const el = await fixture<OnSelf>("on-self-host");
    await flush();
    el.dispatchEvent(new Event("click"));
    expect(hits).toEqual(["self"]);
  });

  it("wires controllers inside a component's shadow root", async () => {
    const connectSpy = vi.fn();

    @attribute("data-shadow-tip")
    class ShadowTip extends LoomAttribute {
      connect() { connectSpy(this.value); }
    }
    void ShadowTip;

    @component("attr-host")
    class AttrHost extends LoomElement {
      update() {
        const div = document.createElement("div");
        div.setAttribute("data-shadow-tip", "inside");
        return div;
      }
    }
    void AttrHost;

    await app.start(); // upgrades @component custom elements
    await fixture<AttrHost>("attr-host");
    await flush();
    expect(connectSpy).toHaveBeenCalledWith("inside");
  });
});
