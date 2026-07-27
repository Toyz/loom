/**
 * A first test, so there is something to copy rather than a blank file.
 *
 * `fixture` mounts the component and waits for its first render; `cleanup`
 * removes anything mounted. app.start() runs in vitest.setup.ts -- without it
 * the tag is never defined and the element mounts as an inert unknown
 * element, which fails in a way that looks like a component bug.
 */
import { describe, it, expect, afterEach } from "vitest";
import { fixture, cleanup } from "@toyz/loom/testing";
import type { MyApp } from "./app";

afterEach(() => cleanup());

describe("my-app", () => {
  it("starts at zero", async () => {
    const el = await fixture<MyApp>("my-app");
    expect(el.shadowRoot?.querySelector(".count")?.textContent).toBe("0");
  });

  it("counts clicks", async () => {
    const el = await fixture<MyApp>("my-app");

    el.shadowRoot?.querySelector("button")?.click();
    await el.updateComplete;

    expect(el.count).toBe(1);
    expect(el.shadowRoot?.querySelector(".count")?.textContent).toBe("1");
  });

  it("derives parity from the count", async () => {
    const el = await fixture<MyApp>("my-app");
    expect(el.parity).toBe("even");

    el.count = 3;
    await el.updateComplete;

    expect(el.parity).toBe("odd");
  });
});
