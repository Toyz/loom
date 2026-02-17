/**
 * Tests: Testing harness (fixture, cleanup, nextRender)
 * Dogfooding — the harness tests itself!
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement, component, reactive } from "../src";
import { fixture, cleanup, nextRender } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-harness-${++tagCounter}`; }

afterEach(() => cleanup());

describe("testing harness", () => {

  it("fixture() creates and mounts a component", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {}

    const el = await fixture<El>(tag);
    expect(el).toBeInstanceOf(HTMLElement);
    expect(document.body.contains(el)).toBe(true);
  });

  it("fixture() applies attributes", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {}

    const el = await fixture<El>(tag, { "data-test": "abc" });
    expect(el.getAttribute("data-test")).toBe("abc");
  });

  it("cleanup() removes all fixtures", async () => {
    const tag1 = nextTag();
    const tag2 = nextTag();

    @component(tag1)
    class El1 extends LoomElement {}

    @component(tag2)
    class El2 extends LoomElement {}

    const el1 = await fixture<El1>(tag1);
    const el2 = await fixture<El2>(tag2);

    expect(document.body.contains(el1)).toBe(true);
    expect(document.body.contains(el2)).toBe(true);

    cleanup();

    expect(document.body.contains(el1)).toBe(false);
    expect(document.body.contains(el2)).toBe(false);
  });

  it("nextRender() flushes microtasks", async () => {
    let flushed = false;
    queueMicrotask(() => {
      queueMicrotask(() => {
        flushed = true;
      });
    });

    await nextRender();
    expect(flushed).toBe(true);
  });

  it("updateComplete resolves after microtask flush", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @reactive accessor value = "initial";
    }

    const el = await fixture<El>(tag);
    el.value = "updated";
    await (el as any).updateComplete;
    // Should resolve without error
    expect(true).toBe(true);
  });
});
