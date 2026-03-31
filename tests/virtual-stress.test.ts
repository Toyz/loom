/**
 * Integration stress: real loom-virtual + shadow DOM + scroll + rAF measurement path.
 * Complements virtual.bench.ts (sync hot-loop mirrors).
 *
 * Explicit `customElements.define` — Vitest/Vite may not run the TS `static {}` block
 * that applies `@component`, so the tag might not register on side-effect import alone.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { LoomVirtual } from "../src/element/virtual";
import { renderLoop } from "../src/render-loop";

const LOOM_VIRTUAL_TAG = "loom-virtual";
if (!customElements.get(LOOM_VIRTUAL_TAG)) {
  customElements.define(LOOM_VIRTUAL_TAG, LoomVirtual as CustomElementConstructor);
}

function rowTemplate(item: number, _i: number): Node {
  const d = document.createElement("div");
  d.textContent = String(item);
  d.style.minHeight = `${20 + (item % 8)}px`;
  return d;
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 15; i++) {
    await new Promise<void>((r) => queueMicrotask(r));
  }
}

function raf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

afterEach(() => {
  renderLoop.stop();
  document.body.replaceChildren();
});

describe("loom-virtual stress", () => {
  it("mounts 10k items, scrolls, runs renderWindow + measure path without throwing", async () => {
    renderLoop.start();
    const el = document.createElement(LOOM_VIRTUAL_TAG) as LoomVirtual<number>;
    (el as unknown as { __childTemplate: typeof rowTemplate }).__childTemplate = rowTemplate;
    el.style.display = "block";
    el.style.height = "400px";
    el.style.width = "100%";
    el.estimatedHeight = 28;
    document.body.appendChild(el);
    const n = 10_000;
    el.items = Array.from({ length: n }, (_, i) => i);
    await flushMicrotasks();

    await vi.waitFor(
      () => {
        const root = el.shadowRoot;
        if (!root?.querySelector(".vl-window") || !root.querySelector(".vl-viewport")) {
          throw new Error("skeleton missing");
        }
      },
      { timeout: 3000, interval: 1 },
    );

    const viewport = el.shadowRoot!.querySelector(".vl-viewport") as HTMLElement;
    const windowEl = el.shadowRoot!.querySelector(".vl-window") as HTMLElement;

    // Imperative first paint — @animationFrame tick may not have run yet
    (el as unknown as { dirty: boolean }).dirty = true;
    (el as unknown as { renderWindow: () => void }).renderWindow();
    await raf();
    expect(windowEl.children.length).toBeGreaterThan(0);

    for (let s = 0; s < 5; s++) {
      viewport.scrollTop = (s * 997) % Math.max(1, viewport.scrollHeight - viewport.clientHeight);
      (el as unknown as { dirty: boolean }).dirty = true;
      (el as unknown as { renderWindow: () => void }).renderWindow();
      await raf();
      (el as unknown as { measureVisible: () => void }).measureVisible();
    }

    el.refresh();
    renderLoop.stop();
  });
});
