/**
 * Loom — Element decorators
 *
 * @component — Register a class as a custom element
 * @query    — Lazy shadow DOM querySelector
 * @queryAll — Lazy shadow DOM querySelectorAll
 */

import { PROPS } from "../decorators/symbols";
import { app } from "../app";
import { createDecorator } from "../decorators/create";

/**
 * Register a class as a custom element. Wires @prop observed attributes
 * and attributeChangedCallback auto-parsing.
 *
 * ```ts
 * @component("my-counter")
 * class MyCounter extends LoomElement { ... }
 * ```
 */
export const component = createDecorator<[tag: string]>((ctor, tag) => {
  const propMap: Map<string, string> =
    (ctor as any)[PROPS] ?? new Map();

  // Wire observedAttributes from @prop fields
  Object.defineProperty(ctor, "observedAttributes", {
    get: () => [...propMap.keys()],
  });

  // Wire attributeChangedCallback to update @prop fields
  const origCallback = (ctor.prototype as any).attributeChangedCallback;
  (ctor.prototype as any).attributeChangedCallback = function (
    name: string,
    _old: string | null,
    val: string | null,
  ) {
    const field = propMap.get(name);
    if (field && val !== null) {
      const current = (this as any)[field];
      if (typeof current === "number") (this as any)[field] = Number(val);
      else if (typeof current === "boolean")
        (this as any)[field] = val !== null && val !== "false";
      else (this as any)[field] = val;
    }
    origCallback?.call(this, name, _old, val);
  };

  app.register(tag, ctor as CustomElementConstructor);
  (ctor as any).__loom_tag = tag;
}, { class: true });

/**
 * Lazy shadow DOM querySelector.
 * ```ts
 * @query(".submit-btn") submitBtn!: HTMLButtonElement;
 * ```
 */
export const query = createDecorator<[selector: string]>((proto, key, selector) => {
  Object.defineProperty(proto, key, {
    get() {
      return this.shadow.querySelector(selector);
    },
    configurable: true,
  });
});

/**
 * Lazy shadow DOM querySelectorAll.
 * ```ts
 * @queryAll("input") inputs!: HTMLInputElement[];
 * ```
 */
export const queryAll = createDecorator<[selector: string]>((proto, key, selector) => {
  Object.defineProperty(proto, key, {
    get() {
      return Array.from(this.shadow.querySelectorAll(selector));
    },
    configurable: true,
  });
});
