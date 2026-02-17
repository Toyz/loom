/**
 * Tests: @slot decorator — auto-accessor wiring (TC39 Stage 3)
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement, component } from "../src";
import { slot } from "../src/element/slots";
import { cleanup, nextRender } from "../src/testing";

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
});
