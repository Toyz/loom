/**
 * Tests: @clipboard — declarative copy/paste
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { LoomElement } from "../src/element";
import { clipboard } from "../src/element/clipboard";
import { component } from "../src/element/decorators";
import { cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-clip-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@clipboard decorator", () => {
  it("write mode: copies return value to clipboard", async () => {
    const tag = nextTag();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: { writeText },
    });

    @component(tag)
    class TestEl extends LoomElement {
      url = "https://example.com";

      @clipboard("write")
      copyLink() { return this.url; }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    const result = el.copyLink();
    expect(result).toBe("https://example.com");
    expect(writeText).toHaveBeenCalledWith("https://example.com");

    el.remove();
    vi.unstubAllGlobals();
  });

  it("write mode: returns the original value", async () => {
    const tag = nextTag();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });

    @component(tag)
    class TestEl extends LoomElement {
      @clipboard("write")
      getData() { return "hello"; }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);
    expect(el.getData()).toBe("hello");

    el.remove();
    vi.unstubAllGlobals();
  });

  it("read mode: binds paste event listener", async () => {
    const tag = nextTag();
    let pasted = "";

    @component(tag)
    class TestEl extends LoomElement {
      @clipboard("read")
      onPaste(text: string) { pasted = text; }
    }
    customElements.define(tag, TestEl);

    const el = document.createElement(tag) as any;
    document.body.appendChild(el);

    // Simulate paste event
    const pasteEvent = new Event("paste") as any;
    pasteEvent.clipboardData = {
      getData: () => "pasted text",
    };
    el.dispatchEvent(pasteEvent);

    expect(pasted).toBe("pasted text");

    el.remove();
  });
});
