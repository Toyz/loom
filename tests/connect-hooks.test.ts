/**
 * Tests: connect-hook decorators target the right DOM node on both hosts.
 *
 * A `LoomElement` *is* its element; a `LoomAttribute` controller is a plain
 * object wrapping a foreign element exposed as `.el`. `hostElement()` exists to
 * bridge that, and @observer/@hotkey/@on already used it — but @clipboard,
 * @draggable, @dropzone and @fullscreen passed the raw hook argument straight
 * to `addEventListener`, which throws on a controller.
 *
 * The decorated method must still be invoked with the raw host as `this`, so
 * handlers can reach the controller's own fields.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomAttribute, attribute, observeAttributes, LoomElement, component } from "../src/element";
import { clipboard } from "../src/element/clipboard";
import { draggable, dropzone } from "../src/element/dnd";
import { fullscreen } from "../src/element/fullscreen";
import { CONNECT_HOOKS, addConnectHook, getConnectHooks } from "../src/decorators/symbols";
import { cleanup, fixture } from "../src/testing";

afterEach(() => cleanup());

/** MutationObserver fires on a microtask; flush a few plus a macrotask. */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise<void>((r) => queueMicrotask(r));
  await new Promise<void>((r) => setTimeout(r, 0));
}

let tagCounter = 0;
const nextTag = () => `hooks-el-${++tagCounter}`;
let attrCounter = 0;
const nextAttr = () => `hooks-attr-${++attrCounter}`;

// ── addConnectHook ──────────────────────────────────────────────────────────

describe("addConnectHook / getConnectHooks", () => {
  it("stores hooks as an own property of the instance", () => {
    const host = {};
    addConnectHook(host, () => {});
    expect(Object.prototype.hasOwnProperty.call(host, CONNECT_HOOKS.key)).toBe(true);
    expect(getConnectHooks(host)).toHaveLength(1);
  });

  it("does not append to a prototype's hook list", () => {
    const proto = {};
    addConnectHook(proto, () => {});

    const a = Object.create(proto);
    const b = Object.create(proto);
    addConnectHook(a, () => {});
    addConnectHook(b, () => {});

    // Each instance copies the inherited hook, then adds its own.
    expect(getConnectHooks(proto)).toHaveLength(1);
    expect(getConnectHooks(a)).toHaveLength(2);
    expect(getConnectHooks(b)).toHaveLength(2);
  });
});

// ── DOM-targeting decorators on a LoomAttribute controller ──────────────────

describe("DOM decorators on a LoomAttribute controller", () => {
  it("@clipboard('read') listens on the wrapped element, not the controller", async () => {
    const attrName = nextAttr();
    const seen = vi.fn();

    @attribute(attrName)
    class Pastable extends LoomAttribute {
      marker = "controller";
      @clipboard("read")
      onPaste(this: Pastable, text: string) { seen(text, this.marker); }
    }
    void Pastable;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const stop = observeAttributes(host);

    const box = document.createElement("div");
    box.setAttribute(attrName, "");
    host.appendChild(box);
    await flush();

    const evt = new Event("paste") as any;
    evt.clipboardData = { getData: () => "pasted text" };
    box.dispatchEvent(evt);

    // Listener landed on the element, and `this` is still the controller.
    expect(seen).toHaveBeenCalledWith("pasted text", "controller");

    stop();
    host.remove();
  });

  it("@draggable sets draggable on the wrapped element and binds this", async () => {
    const attrName = nextAttr();

    @attribute(attrName)
    class Drag extends LoomAttribute {
      payload = "card-7";
      @draggable()
      getData(this: Drag) { return this.payload; }
    }
    void Drag;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const stop = observeAttributes(host);

    const card = document.createElement("div");
    card.setAttribute(attrName, "");
    host.appendChild(card);
    await flush();

    expect(card.draggable).toBe(true);

    let transferred = "";
    const evt = new Event("dragstart") as any;
    evt.dataTransfer = {
      setData: (_t: string, v: string) => { transferred = v; },
      effectAllowed: "",
    };
    card.dispatchEvent(evt);

    expect(transferred).toBe("card-7");
    expect(card.classList.contains("dragging")).toBe(true);

    stop();
    host.remove();
  });

  it("@dropzone wires drop on the wrapped element and binds this", async () => {
    const attrName = nextAttr();
    const dropped = vi.fn();

    @attribute(attrName)
    class Zone extends LoomAttribute {
      zoneId = "inbox";
      @dropzone()
      onDrop(this: Zone, data: string) { dropped(data, this.zoneId); }
    }
    void Zone;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const stop = observeAttributes(host);

    const target = document.createElement("div");
    target.setAttribute(attrName, "");
    host.appendChild(target);
    await flush();

    const evt = new Event("drop", { cancelable: true }) as any;
    evt.dataTransfer = { getData: () => "payload", dropEffect: "" };
    target.dispatchEvent(evt);

    expect(dropped).toHaveBeenCalledWith("payload", "inbox");

    stop();
    host.remove();
  });

  it("@fullscreen mounts on a controller without throwing", async () => {
    const attrName = nextAttr();

    @attribute(attrName)
    class Fs extends LoomAttribute {
      @fullscreen() accessor isFullscreen = false;
    }
    void Fs;

    const host = document.createElement("div");
    document.body.appendChild(host);
    const stop = observeAttributes(host);

    const box = document.createElement("div");
    box.setAttribute(attrName, "");
    host.appendChild(box);
    await flush();

    // Mounting used to throw before hostElement() was applied.
    document.dispatchEvent(new Event("fullscreenchange"));
    await flush();

    stop();
    host.remove();
  });
});

// ── Same decorators on a LoomElement still behave ───────────────────────────

describe("DOM decorators on a LoomElement (unchanged behavior)", () => {
  it("@draggable still targets the component itself", async () => {
    const tag = nextTag();

    @component(tag)
    class Card extends LoomElement {
      payload = "el-payload";
      @draggable()
      getData(this: Card) { return this.payload; }
    }
    customElements.define(tag, Card);

    const el = await fixture<Card>(tag);
    expect(el.draggable).toBe(true);

    let transferred = "";
    const evt = new Event("dragstart") as any;
    evt.dataTransfer = { setData: (_t: string, v: string) => { transferred = v; }, effectAllowed: "" };
    el.dispatchEvent(evt);

    expect(transferred).toBe("el-payload");
  });

  it("@clipboard('read') still targets the component itself", async () => {
    const tag = nextTag();
    const seen = vi.fn();

    @component(tag)
    class Editor extends LoomElement {
      marker = "element";
      @clipboard("read")
      onPaste(this: Editor, text: string) { seen(text, this.marker); }
    }
    customElements.define(tag, Editor);

    const el = await fixture<Editor>(tag);
    const evt = new Event("paste") as any;
    evt.clipboardData = { getData: () => "hi" };
    el.dispatchEvent(evt);

    expect(seen).toHaveBeenCalledWith("hi", "element");
  });
});
