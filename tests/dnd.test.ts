/**
 * Tests: @draggable / @dropzone — declarative DnD
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { LoomElement } from "../src/element";
import { draggable, dropzone } from "../src/element/dnd";
import { component } from "../src/element/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-dnd-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@draggable decorator", () => {
  it("sets draggable=true on connect", async () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @draggable()
      getDragData() { return "hello"; }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    expect(el.draggable).toBe(true);

    el.remove();
  });

  it("removes draggable on disconnect", async () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @draggable()
      getDragData() { return "hello"; }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    expect(el.draggable).toBe(true);

    el.remove();
    expect(el.draggable).toBe(false);
  });

  it("sets data on dragstart", async () => {
    const tag = nextTag();
    const setData = vi.fn();

    @component(tag)
    class TestEl extends LoomElement {
      @draggable({ type: "application/json" })
      getDragData() { return JSON.stringify({ id: 1 }); }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    const event = new Event("dragstart") as any;
    event.dataTransfer = {
      setData,
      effectAllowed: "none",
    };
    el.dispatchEvent(event);

    expect(setData).toHaveBeenCalledWith("application/json", '{"id":1}');
    expect(event.dataTransfer.effectAllowed).toBe("move");

    el.remove();
  });
});

describe("@dropzone decorator", () => {
  it("prevents default on dragover", async () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone()
      onDrop(_data: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    const event = new Event("dragover", { cancelable: true }) as any;
    event.dataTransfer = { dropEffect: "none" };
    el.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);

    el.remove();
  });

  it("adds drag-over class on dragover", async () => {
    const tag = nextTag();

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ overClass: "hovering" })
      onDrop(_data: string) {}
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    const overEvent = new Event("dragover", { cancelable: true }) as any;
    overEvent.dataTransfer = { dropEffect: "none" };
    el.dispatchEvent(overEvent);
    expect(el.classList.contains("hovering")).toBe(true);

    // Remove on dragleave
    el.dispatchEvent(new Event("dragleave"));
    expect(el.classList.contains("hovering")).toBe(false);

    el.remove();
  });

  it("calls method with data on drop", async () => {
    const tag = nextTag();
    let received = "";

    @component(tag)
    class TestEl extends LoomElement {
      @dropzone({ accept: "text/plain" })
      onDrop(data: string) { received = data; }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    const event = new Event("drop", { cancelable: true }) as any;
    event.dataTransfer = {
      getData: (type: string) => type === "text/plain" ? "dropped-data" : "",
    };
    el.dispatchEvent(event);

    expect(received).toBe("dropped-data");

    el.remove();
  });
});
