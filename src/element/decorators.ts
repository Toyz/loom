/**
 * Loom — Element decorators (TC39 Stage 3)
 *
 * @component — Register a class as a custom element
 * @query    — Lazy shadow DOM querySelector (auto-accessor)
 * @queryAll — Lazy shadow DOM querySelectorAll (auto-accessor)
 * @styles   — Adopt CSSStyleSheets on connect (class decorator)
 */

import { PROPS, TRANSFORMS, CONNECT_HOOKS, REACTIVES } from "../decorators/symbols";
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
export const component = createDecorator<[tag: string, opts?: { shadow?: boolean }]>((ctor, tag, opts) => {
  if (opts?.shadow === false) (ctor as any).__loom_noshadow = true;
  // Flush pendingProps from @prop decorators (member decorators run before class decorators)
  const propMap: Map<string, string> =
    (ctor as any)[PROPS.key] ?? new Map();
  for (const { key } of pendingProps) {
    propMap.set(key.toLowerCase(), key);
  }
  pendingProps.length = 0; // clear staging area
  (ctor as any)[PROPS.key] = propMap;

  // Wire observedAttributes from @prop fields — cache the array
  const _cachedAttrs = Array.from(propMap.keys());
  Object.defineProperty(ctor, "observedAttributes", {
    get: () => _cachedAttrs,
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
      const transforms: Map<string, Function> | undefined = (ctor as any)[TRANSFORMS.key];
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
      // Light DOM: adopt into the containing root (parent shadow root or document)
      // Shadow DOM: adopt into own shadow root (as before)
      const root = (this.constructor as any).__loom_noshadow
        ? this.getRootNode() as Document | ShadowRoot
        : this.shadow;

      if ('adoptedStyleSheets' in root) {
        const existing = root.adoptedStyleSheets;
        const toAdd: CSSStyleSheet[] = [];
        for (let i = 0; i < sheets.length; i++) {
          if (!existing.includes(sheets[i])) toAdd.push(sheets[i]);
        }
        if (toAdd.length > 0) {
          root.adoptedStyleSheets = existing.concat(toAdd);
        }
      }
      orig?.call(this);
    };
  };
}

/**
 * Dynamic scoped styles from a method. The method returns a CSS string
 * that is adopted into the component's shadow root. When any @reactive
 * or @store value read during the method changes, the styles are
 * automatically re-evaluated and updated in-place.
 *
 * Use this for theme-reactive or state-dependent styles that need
 * to go beyond CSS custom properties or inline styles.
 *
 * ```ts
 * @component("themed-card")
 * class ThemedCard extends LoomElement {
 *   @reactive accessor accent = "#a78bfa";
 *   @reactive accessor radius = 8;
 *
 *   @css
 *   dynamicStyles() {
 *     return `
 *       :host { border-radius: ${this.radius}px; }
 *       .card { border: 2px solid ${this.accent}; }
 *     `;
 *   }
 * }
 * ```
 *
 * Static styles should still use `@styles(css\`...\`)` for best
 * performance (shared CSSStyleSheet, no re-evaluation).
 */
export function dynamicCss(
  method: Function,
  context: ClassMethodDecoratorContext,
) {
  const key = String(context.name);

  context.addInitializer(function (this: any) {
    const hooks: Array<(el: any) => (() => void) | void> = this[CONNECT_HOOKS.key] ?? [];
    this[CONNECT_HOOKS.key] = hooks;

    hooks.push((el: any) => {
      const sheet = new CSSStyleSheet();

      // Initial evaluation
      const cssText = el[key]();
      if (typeof cssText === "string" && cssText.length > 0) {
        sheet.replaceSync(cssText);
      }

      // Adopt into shadow root
      const root = (el.constructor as any).__loom_noshadow
        ? el.getRootNode() as Document | ShadowRoot
        : el.shadow;

      if ('adoptedStyleSheets' in root) {
        root.adoptedStyleSheets = root.adoptedStyleSheets.concat(sheet);
      }

      // Subscribe to reactive changes — re-evaluate when deps fire
      const unsubs: (() => void)[] = [];

      // Use a flag to debounce rapid changes into one replaceSync
      let cssScheduled = false;
      const refreshCSS = () => {
        if (cssScheduled) return;
        cssScheduled = true;
        queueMicrotask(() => {
          cssScheduled = false;
          const newCSS = el[key]();
          if (typeof newCSS === "string") {
            sheet.replaceSync(newCSS);
          }
        });
      };

      // Discover all backing Reactive instances on the element.
      // localSymbol creates Symbol() with description "loom:reactive:<field>",
      // "loom:store:<field>", or "loom:signal:<field>".
      const allSymbols = Object.getOwnPropertySymbols(el);
      for (const sym of allSymbols) {
        const desc = sym.description ?? "";
        if (desc.startsWith("loom:reactive:") ||
            desc.startsWith("loom:store:") ||
            desc.startsWith("loom:signal:")) {
          const reactive = el[sym];
          if (reactive && typeof reactive.subscribe === "function") {
            unsubs.push(reactive.subscribe(refreshCSS));
          }
        }
      }

      // Cleanup on disconnect
      return () => {
        for (const u of unsubs) u();
        unsubs.length = 0;

        // Remove the sheet from adopted styles
        if ('adoptedStyleSheets' in root) {
          root.adoptedStyleSheets = root.adoptedStyleSheets.filter(
            (s: CSSStyleSheet) => s !== sheet
          );
        }
      };
    });
  });
}

