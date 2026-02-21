/**
 * Tests: JSX update() → DOM morphing integration
 *
 * Verifies that Loom components using JSX in their update() method
 * correctly morph the shadow DOM on re-renders.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { reactive } from "../src/store/decorators";
import { fixture, cleanup, nextRender } from "../src/testing";
import { jsx, Fragment } from "../src/jsx-runtime";

let tagCounter = 0;
function nextTag() { return `test-jsx-morph-${++tagCounter}`; }

afterEach(() => cleanup());

describe("JSX → morph integration", () => {
  it("renders JSX from update() into shadow DOM", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      update() {
        return <div class="hello">Hello World</div>;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await nextRender();

    const div = el.shadowRoot!.querySelector(".hello");
    expect(div).toBeTruthy();
    expect(div!.textContent).toBe("Hello World");
  });

  it("morphs shadow DOM when reactive state changes", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @reactive accessor count = 0;

      update() {
        return <span class="count">{String(this.count)}</span>;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await nextRender();

    expect(el.shadowRoot!.querySelector(".count")!.textContent).toBe("0");

    (el as any).count = 42;
    await nextRender();

    expect(el.shadowRoot!.querySelector(".count")!.textContent).toBe("42");
  });

  it("morphs complex JSX trees preserving keyed elements", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @reactive accessor items: string[] = ["a", "b", "c"];

      update() {
        return (
          <ul>
            {this.items.map(item => (
              <li loom-key={item}>{item}</li>
            ))}
          </ul>
        );
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await nextRender();

    const list = el.shadowRoot!.querySelector("ul");
    expect(list).toBeTruthy();
    expect(list!.children.length).toBe(3);

    // Reverse items
    (el as any).items = ["c", "b", "a"];
    await nextRender();

    const children = Array.from(list!.children);
    expect(children[0].textContent).toBe("c");
    expect(children[2].textContent).toBe("a");
  });

  it("renders Fragment children", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      update() {
        return (
          <>
            <span>one</span>
            <span>two</span>
          </>
        );
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await nextRender();

    const spans = el.shadowRoot!.querySelectorAll("span");
    expect(spans.length).toBe(2);
    expect(spans[0].textContent).toBe("one");
    expect(spans[1].textContent).toBe("two");
  });

  it("handles conditional JSX rendering", async () => {
    const tag = nextTag();

    class El extends LoomElement {
      @reactive accessor show = true;

      update() {
        return this.show
          ? <div class="visible">Shown</div>
          : <div class="hidden">Hidden</div>;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await nextRender();

    expect(el.shadowRoot!.querySelector(".visible")).toBeTruthy();
    expect(el.shadowRoot!.querySelector(".hidden")).toBeNull();

    (el as any).show = false;
    await nextRender();

    expect(el.shadowRoot!.querySelector(".visible")).toBeNull();
    expect(el.shadowRoot!.querySelector(".hidden")).toBeTruthy();
  });

  it("attaches JSX event handlers in shadow DOM", async () => {
    const tag = nextTag();
    const fn = vi.fn();

    class El extends LoomElement {
      update() {
        return <button onClick={fn}>Click</button>;
      }
    }
    customElements.define(tag, El);

    const el = await fixture<El>(tag);
    await nextRender();

    const btn = el.shadowRoot!.querySelector("button")!;
    btn.dispatchEvent(new Event("click"));
    expect(fn).toHaveBeenCalledOnce();
  });
});
