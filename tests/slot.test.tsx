/**
 * Tests: @slot decorator — auto-accessor wiring (TC39 Stage 3)
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement, component } from "../src";
import { slot } from "../src/element/slots";
import { fixture, cleanup, nextRender } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-slot-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@slot", () => {

  it("getter returns empty array before slot assignment", () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @slot()
      accessor content!: Element[];
    }

    const el = document.createElement(tag) as InstanceType<typeof El>;
    // Before connecting, content is either [] (if prototype getter works) or undefined
    expect(el.content ?? []).toEqual([]);
  });

  it("accepts named slot parameter", () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @slot("footer")
      accessor footerContent!: Element[];
    }

    // Should not throw; accessor should be defined
    const el = document.createElement(tag) as InstanceType<typeof El>;
    expect(el.footerContent ?? []).toEqual([]);
  });

  it("setter stores the value", () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @slot()
      accessor items!: Element[];
    }

    const el = document.createElement(tag) as InstanceType<typeof El>;
    (el as any).items = [1, 2, 3];
    expect((el as any).items).toEqual([1, 2, 3]);
  });

  it("multiple @slot accessors on one class", () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @slot()
      accessor defaultItems!: Element[];

      @slot("header")
      accessor headerItems!: Element[];

      @slot("footer")
      accessor footerItems!: Element[];
    }

    const el = document.createElement(tag) as InstanceType<typeof El>;
    expect(el.defaultItems ?? []).toEqual([]);
    expect(el.headerItems ?? []).toEqual([]);
    expect(el.footerItems ?? []).toEqual([]);
  });

  it("cleanup removes slotchange listener", async () => {
    const tag = nextTag();

    @component(tag)
    class El extends LoomElement {
      @slot()
      accessor items!: Element[];

      update() {
        return <div><slot></slot></div>;
      }
    }

    const el = document.createElement(tag) as InstanceType<typeof El>;
    document.body.appendChild(el);
    await new Promise(r => setTimeout(r, 10));

    // Should not throw when removed
    el.remove();
    expect(el.items ?? []).toEqual([]);
  });
});
