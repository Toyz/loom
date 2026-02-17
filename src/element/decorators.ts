/**
 * Loom — Element decorators (TC39 Stage 3)
 *
 * @component — Register a class as a custom element
 * @query    — Lazy shadow DOM querySelector (auto-accessor)
 * @queryAll — Lazy shadow DOM querySelectorAll (auto-accessor)
 * @styles   — Adopt CSSStyleSheets on connect (class decorator)
 */

import { PROPS, TRANSFORMS } from "../decorators/symbols";
import { app } from "../app";
import { createDecorator } from "../decorators/create";
import { pendingProps } from "../store/decorators";

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
  // Flush pendingProps from @prop decorators (member decorators run before class decorators)
  const propMap: Map<string, string> =
    (ctor as any)[PROPS] ?? new Map();
  for (const { key } of pendingProps) {
    propMap.set(key.toLowerCase(), key);
  }
  pendingProps.length = 0; // clear staging area
  (ctor as any)[PROPS] = propMap;

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
      const transforms: Map<string, Function> | undefined = (ctor as any)[TRANSFORMS];
      const transform = transforms?.get(field);
      if (transform) {
        (this as any)[field] = transform(val);
      } else {
        const current = (this as any)[field];
        if (typeof current === "number") (this as any)[field] = Number(val);
        else if (typeof current === "boolean")
          (this as any)[field] = val !== null && val !== "false";
        else (this as any)[field] = val;
      }
    }
    origCallback?.call(this, name, _old, val);
  };

  app.register(tag, ctor as CustomElementConstructor);
  (ctor as any).__loom_tag = tag;
}, { class: true });


/**
 * Lazy shadow DOM querySelector (auto-accessor).
 * ```ts
 * @query(".submit-btn") accessor submitBtn!: HTMLButtonElement;
 * ```
 */
export function query<V>(selector: string) {
  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, V>,
    _context: ClassAccessorDecoratorContext<This, V>,
  ): ClassAccessorDecoratorResult<This, V> => {
    return {
      get(this: This) {
        return (this as any).shadow.querySelector(selector) as V;
      },
    };
  };
}

/**
 * Lazy shadow DOM querySelectorAll (auto-accessor).
 * ```ts
 * @queryAll("input") accessor inputs!: HTMLInputElement[];
 * ```
 */
export function queryAll<V>(selector: string) {
  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, V>,
    _context: ClassAccessorDecoratorContext<This, V>,
  ): ClassAccessorDecoratorResult<This, V> => {
    return {
      get(this: This) {
        return Array.from((this as any).shadow.querySelectorAll(selector)) as V;
      },
    };
  };
}

/**
 * Auto-adopt one or more CSSStyleSheets when the element connects.
 * Accepts sheets created with the `css` tagged template.
 *
 * ```ts
 * const myStyles = css`...`;
 *
 * @component("my-el")
 * @styles(myStyles)
 * class MyEl extends LoomElement { ... }
 * ```
 *
 * Multiple `@styles()` calls stack (all sheets are adopted).
 */
export function styles(...sheets: CSSStyleSheet[]) {
  return (value: Function, _context: ClassDecoratorContext) => {
    const orig = value.prototype.connectedCallback;
    value.prototype.connectedCallback = function () {
      const existing = this.shadow.adoptedStyleSheets;
      const newSheets = sheets.filter((s: CSSStyleSheet) => !existing.includes(s));
      if (newSheets.length > 0) {
        this.shadow.adoptedStyleSheets = [...existing, ...newSheets];
      }
      orig?.call(this);
    };
  };
}
