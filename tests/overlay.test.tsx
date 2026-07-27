/**
 * @popover and @dialog.
 *
 * happy-dom has <dialog>.showModal but no popover API, which is a useful
 * split: the dialog tests run against a real implementation, and the popover
 * tests cover both the supported path (via a fake) and the fallback that
 * Firefox and older Safari actually take.
 *
 * The behaviour worth pinning down is the write-back. Escape and light
 * dismiss close the overlay without going through the accessor, so unless the
 * DOM writes state back, `open` says true while nothing is on screen.
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement, component } from "../src/index";
import { popover, dialog } from "../src/element/overlay";

let tag = 0;
const nextTag = () => `overlay-el-${++tag}`;

/** Give the popover API to elements that lack it, recording the calls. */
function installPopover() {
  const proto = HTMLElement.prototype as any;
  proto.showPopover = function () {
    if (this.__open) throw new Error("InvalidStateError");
    this.__open = true;
    this.dispatchEvent(Object.assign(new Event("toggle"), { newState: "open" }));
  };
  proto.hidePopover = function () {
    if (!this.__open) throw new Error("InvalidStateError");
    this.__open = false;
    this.dispatchEvent(Object.assign(new Event("toggle"), { newState: "closed" }));
  };
}
function removePopover() {
  delete (HTMLElement.prototype as any).showPopover;
  delete (HTMLElement.prototype as any).hidePopover;
}

async function mount<T = any>(name: string): Promise<T> {
  const el = document.createElement(name) as any;
  document.body.appendChild(el);
  await Promise.resolve();
  await Promise.resolve();
  return el;
}

afterEach(() => {
  removePopover();
  document.body.innerHTML = "";
});

describe("@popover", () => {
  it("opens and closes the popover element", async () => {
    installPopover();
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @popover accessor open = false;
      update() { return <div popover="auto" id="p">menu</div>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount(t + "-x");
    const node = el.shadowRoot.querySelector("#p");
    expect(node.__open).toBeFalsy();

    el.open = true;
    expect(node.__open).toBe(true);

    el.open = false;
    expect(node.__open).toBe(false);
  });

  it("writes back when the browser dismisses it", async () => {
    installPopover();
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @popover accessor open = false;
      update() { return <div popover="auto" id="p">menu</div>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount(t + "-x");
    el.open = true;
    expect(el.open).toBe(true);

    // Light dismiss / Escape: the browser closes it and fires `toggle`
    // without anything going through the accessor.
    const node = el.shadowRoot.querySelector("#p");
    node.hidePopover();

    expect(el.open).toBe(false);
  });

  it("does not loop between the accessor and the DOM", async () => {
    installPopover();
    const t = nextTag();
    let sets = 0;

    @component(t)
    class El extends LoomElement {
      @popover accessor open = false;
      update() {
        sets++;
        return <div popover="auto" id="p">menu</div>;
      }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount(t + "-x");
    const before = sets;
    el.open = true;
    await Promise.resolve();
    await Promise.resolve();
    // A write-back that re-entered the setter would recurse without bound.
    expect(sets - before).toBeLessThan(5);
    expect(el.open).toBe(true);
  });

  it("falls back to hidden where the popover API is missing", async () => {
    // No installPopover: Firefox before 125, older Safari, happy-dom.
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @popover accessor open = false;
      update() { return <div popover="auto" id="p">menu</div>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount(t + "-x");
    const node = el.shadowRoot.querySelector("#p");

    el.open = true;
    expect(node.hidden).toBe(false);
    el.open = false;
    expect(node.hidden).toBe(true);
  });

  it("takes an explicit target selector", async () => {
    installPopover();
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @popover({ target: "#second" }) accessor open = false;
      update() {
        return (
          <>
            <div popover="auto" id="first">a</div>
            <div popover="auto" id="second">b</div>
          </>
        );
      }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount(t + "-x");
    el.open = true;
    expect(el.shadowRoot.querySelector("#second").__open).toBe(true);
    expect(el.shadowRoot.querySelector("#first").__open).toBeFalsy();
  });
});

describe("@dialog", () => {
  it("opens modally and closes", async () => {
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @dialog accessor open = false;
      update() { return <dialog id="d">confirm</dialog>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount(t + "-x");
    const d = el.shadowRoot.querySelector("#d");
    expect(d.open).toBe(false);

    el.open = true;
    expect(d.open).toBe(true);

    el.open = false;
    expect(d.open).toBe(false);
  });

  it("writes back when the dialog closes itself", async () => {
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @dialog accessor open = false;
      update() { return <dialog id="d">confirm</dialog>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount(t + "-x");
    el.open = true;

    // Escape, or a <form method="dialog"> submit.
    el.shadowRoot.querySelector("#d").close();

    expect(el.open).toBe(false);
  });

  it("supports non-modal", async () => {
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @dialog({ modal: false }) accessor open = false;
      update() { return <dialog id="d">toast</dialog>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount(t + "-x");
    el.open = true;
    expect(el.shadowRoot.querySelector("#d").open).toBe(true);
  });

  it("closes on disconnect, so nothing is stranded in the top layer", async () => {
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @dialog accessor open = false;
      update() { return <dialog id="d">confirm</dialog>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount(t + "-x");
    const d = el.shadowRoot.querySelector("#d");
    el.open = true;
    expect(d.open).toBe(true);

    // A modal left open would keep the rest of the page inert with no way
    // left to dismiss it.
    el.remove();
    expect(d.open).toBe(false);
  });
});

describe("@dialog closes without a close event", () => {
  it("writes back when only the open attribute is removed", async () => {
    // A <form method="dialog"> submit closes a dialog inside a shadow root
    // without firing `close` in Chrome -- verified with identical markup in
    // both trees. Since every component renders into a shadow root, that is
    // the normal path here, and the events alone would leave the accessor
    // stuck on "open" while the dialog is gone.
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @dialog accessor open = false;
      update() { return <dialog id="d">confirm</dialog>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount(t + "-x");
    el.open = true;
    const d = el.shadowRoot.querySelector("#d");
    expect(d.open).toBe(true);

    // Exactly what the browser does on a method="dialog" submit: the
    // attribute goes, and no event is dispatched.
    d.removeAttribute("open");
    await new Promise((r) => setTimeout(r, 10));

    expect(el.open).toBe(false);
  });

  it("stops observing after disconnect", async () => {
    const t = nextTag();

    @component(t)
    class El extends LoomElement {
      @dialog accessor open = false;
      update() { return <dialog id="d">confirm</dialog>; }
    }
    customElements.define(t + "-x", class extends El {});

    const el = await mount(t + "-x");
    el.open = true;
    const d = el.shadowRoot.querySelector("#d");
    el.remove();
    await new Promise((r) => setTimeout(r, 10));

    expect(() => d.removeAttribute("open")).not.toThrow();
  });
});
