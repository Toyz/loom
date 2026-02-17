/**
 * Loom — Testing harness
 *
 * Utilities for mounting components in tests and waiting for renders.
 *
 * ```ts
 * import { fixture, fixtureHTML, cleanup, nextRender } from "@toyz/loom/testing";
 *
 * // Mount by tag name
 * const el = await fixture<MyCounter>("my-counter");
 * el.count = 5;
 * await el.updateComplete;
 * expect(el.shadow.querySelector("span")?.textContent).toBe("5");
 *
 * // Mount from an HTML template string
 * const el2 = await fixtureHTML<MyCard>(`<my-card title="Hello">content</my-card>`);
 * expect(el2.shadow.querySelector("h2")?.textContent).toBe("Hello");
 *
 * cleanup(); // removes all fixtures
 * ```
 */

import type { LoomElement } from "./element/element";

const containers: HTMLDivElement[] = [];

/** Type for elements returned by fixture helpers */
type Rendered<T> = T & { updateComplete: Promise<void> };

/**
 * Mount a component by tag name and wait for its first render.
 * Returns the element instance with full type access.
 *
 * @param tag   Custom element tag name
 * @param attrs Optional attribute key/value pairs to set before mount
 */
export async function fixture<T extends HTMLElement = LoomElement>(
  tag: string,
  attrs?: Record<string, string>,
): Promise<Rendered<T>> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  containers.push(container);

  const el = document.createElement(tag) as T;

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
  }

  container.appendChild(el);
  wireUpdateComplete(el);
  await flushMicrotasks();

  return el as Rendered<T>;
}

/**
 * Mount a component from an HTML template string and wait for its first render.
 * Useful for testing slot content, nested components, and attribute combinations.
 *
 * Returns the first child element with full type access.
 *
 * @param html  HTML string containing the component to mount
 */
export async function fixtureHTML<T extends HTMLElement = LoomElement>(
  html: string,
): Promise<Rendered<T>> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  containers.push(container);

  container.innerHTML = html;

  const el = container.firstElementChild as T;
  if (!el) throw new Error("fixtureHTML: no element found in template");

  wireUpdateComplete(el);
  await flushMicrotasks();

  return el as Rendered<T>;
}

/**
 * Remove all fixture containers from the document.
 * Call this in afterEach or test teardown.
 */
export function cleanup(): void {
  for (const container of containers) {
    container.remove();
  }
  containers.length = 0;
}

/**
 * Wait for a Loom element to complete its next render cycle.
 * Useful after programmatic state changes.
 */
export async function nextRender(): Promise<void> {
  await flushMicrotasks();
}

// ── Internal helpers ──

/** Flush several microtask levels to account for nested queueMicrotask chains. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await new Promise<void>((r) => queueMicrotask(r));
  }
}

/** Wire an `updateComplete` getter onto an element if it doesn't already have one. */
function wireUpdateComplete(el: HTMLElement): void {
  if (!("updateComplete" in el)) {
    Object.defineProperty(el, "updateComplete", {
      get() {
        return flushMicrotasks();
      },
    });
  }
}
