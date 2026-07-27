/**
 * Loom — ElementInternals
 *
 * The one browser API a custom-elements framework cannot skip, and the one
 * Loom did not touch. `attachInternals()` is the door to three separate
 * things, all of which people otherwise fake badly:
 *
 *  - **Form association.** Without it a component inside a `<form>` is
 *    furniture: it submits nothing, never reports validity, and ignores reset.
 *    `@form` manages the state but is deliberately DOM-independent, so the
 *    form the component sits in has never been able to see it.
 *  - **`:state()`.** A custom state is selectable from CSS -- including from
 *    outside the shadow root, by a parent -- without adding a class or an
 *    attribute to the host, which is the usual workaround and leaks internals
 *    into markup anyone can overwrite.
 *  - **ARIA reflection.** A default role and aria-* values that live on the
 *    element rather than in its attributes, so the component is accessible
 *    without the author having to remember to write them on every usage.
 *
 * All of it is feature-detected. `attachInternals` is absent in older Safari
 * and in most test DOMs, and `CustomStateSet` shipped later than internals
 * themselves; a component that uses any of this still renders where they are
 * missing, it just loses the corresponding behaviour.
 */

import { localSymbol } from "../decorators/symbols.js";
import { addConnectHook, hostElement } from "../decorators/symbols.js";

/** Minimal shape of what we use, so this compiles without lib.dom's latest. */
export interface LoomInternals {
  setFormValue?(value: FormValue, state?: FormValue): void;
  setValidity?(flags?: ValidityStateFlags, message?: string, anchor?: HTMLElement): void;
  checkValidity?(): boolean;
  reportValidity?(): boolean;
  readonly form?: HTMLFormElement | null;
  readonly validity?: ValidityState;
  readonly validationMessage?: string;
  readonly willValidate?: boolean;
  states?: Set<string>;
  role?: string | null;
  [ariaProp: string]: unknown;
}

/** What a form control may submit. */
export type FormValue = string | File | FormData | null;

const INTERNALS = localSymbol<LoomInternals | null>("internals");

/** True when the browser supports attachInternals at all. */
export const supportsInternals = (): boolean =>
  typeof HTMLElement !== "undefined" &&
  typeof (HTMLElement.prototype as { attachInternals?: unknown }).attachInternals === "function";

/**
 * The element's ElementInternals, attached once and cached.
 *
 * `attachInternals()` throws on a second call for the same element, so every
 * feature here has to share one -- which is the reason this is a module rather
 * than three decorators each calling it.
 */
export function internalsFor(el: HTMLElement): LoomInternals | null {
  if (INTERNALS.has(el)) return INTERNALS.from(el) ?? null;

  let value: LoomInternals | null = null;
  const attach = (el as unknown as { attachInternals?: () => LoomInternals }).attachInternals;
  if (typeof attach === "function") {
    try {
      value = attach.call(el);
    } catch {
      // Thrown when the element was not defined with the internals-enabled
      // constructor, or when something else already attached. Degrade rather
      // than take the component down with it.
      value = null;
    }
  }
  INTERNALS.set(el, value);
  return value;
}

// ── Custom states -----------------------------------------------------------

/**
 * A state name, in the one place both the setter and the CSS author read it.
 *
 * Old Chrome exposed `states` as a Set that wanted `--dashed` names; the
 * shipped spec takes the bare identifier. Normalising here means a component
 * written today keeps working on the browsers that shipped the draft.
 */
function applyState(states: Set<string>, name: string, on: boolean): void {
  const write = (value: string) => {
    try {
      if (on) states.add(value);
      else states.delete(value);
    } catch {
      /* draft implementations throw on the wrong spelling -- try the other */
    }
  };
  write(name);
  if (name.startsWith("--")) return;
  // Only reach for the legacy spelling when the modern one did not take.
  if (on && !states.has(name)) write(`--${name}`);
  else if (!on) {
    try { states.delete(`--${name}`); } catch { /* nothing to remove */ }
  }
}

/** Set or clear a custom state on an element. No-op where unsupported. */
export function setState(el: HTMLElement, name: string, on: boolean): void {
  const states = internalsFor(el)?.states;
  if (states) applyState(states, name, on);
}

/** Whether a custom state is currently set. */
export function hasState(el: HTMLElement, name: string): boolean {
  const states = internalsFor(el)?.states;
  if (!states) return false;
  return states.has(name) || states.has(`--${name}`);
}

/**
 * Mirror a boolean accessor into a custom state, selectable as
 * `my-el:state(name)`.
 *
 * ```ts
 * @state accessor loading = false;
 * @state("has-error") accessor error: string | null = null;
 * ```
 *
 * The value is coerced the way a template would read it, so a nullable string
 * works as an on/off state without a second boolean beside it.
 *
 * This is the sanctioned replacement for toggling a class or attribute on the
 * host: a class is part of the public markup and anything can overwrite it,
 * while a custom state cannot be set from outside the component.
 */
export function state(
  nameOrTarget?: string | ClassAccessorDecoratorTarget<unknown, unknown>,
  maybeContext?: ClassAccessorDecoratorContext,
): any {
  // Dual form. `@state accessor x` arrives as (target, context); `@state("n")`
  // arrives with a string, or nothing, and has to return the decorator. The
  // discriminator is the context's `kind`, not the argument count -- a bare
  // decorator is called with two arguments too.
  const named = typeof nameOrTarget === "string" || nameOrTarget === undefined;
  const name = typeof nameOrTarget === "string" ? nameOrTarget : undefined;

  const decorate = (
    target: ClassAccessorDecoratorTarget<unknown, unknown>,
    context: ClassAccessorDecoratorContext,
  ): ClassAccessorDecoratorResult<unknown, unknown> => {
    const stateName = name ?? String(context.name);
    return {
      get(this: HTMLElement) {
        return target.get.call(this);
      },
      set(this: HTMLElement, value: unknown) {
        target.set.call(this, value);
        setState(this, stateName, Boolean(value));
      },
      init(this: HTMLElement, value: unknown) {
        // The initial value has to land too, or a component that starts in a
        // state renders once without it and only picks it up on first write.
        // Deferred to connect: attachInternals during field initialisation is
        // before the element is upgraded far enough to accept it.
        addConnectHook(this, (el: HTMLElement) => {
          setState(hostElement(el), stateName, Boolean(target.get.call(hostElement(el))));
        });
        return value;
      },
    };
  };

  if (!named && maybeContext?.kind === "accessor") {
    return decorate(nameOrTarget as ClassAccessorDecoratorTarget<unknown, unknown>, maybeContext);
  }
  return decorate;
}

// ── ARIA ---------------------------------------------------------------------

/** Every ARIA property ElementInternals reflects, minus the `aria` prefix. */
export type AriaProps = {
  role?: string;
} & Partial<Record<`aria${string}`, string | null>>;

/**
 * Give a component a default role and ARIA properties.
 *
 * ```ts
 * @component("my-switch")
 * @aria({ role: "switch", ariaChecked: "false" })
 * class MySwitch extends LoomElement {}
 * ```
 *
 * These live on the element rather than in its attributes, so they do not have
 * to be repeated at every usage and cannot be lost when someone writes the tag
 * without them. An attribute on the host still wins, which is what lets a
 * caller override a default.
 */
export function aria(props: AriaProps) {
  return (ctor: Function): void => {
    const proto = ctor.prototype as { connectedCallback?: () => void };
    const original = proto.connectedCallback;
    proto.connectedCallback = function (this: HTMLElement) {
      const internals = internalsFor(this);
      if (internals) {
        for (const [key, value] of Object.entries(props)) {
          try {
            (internals as Record<string, unknown>)[key] = value;
          } catch {
            // Firefox shipped reflection later than internals; a component
            // that only wants a role should not fail to connect over it.
          }
        }
      }
      original?.call(this);
    };
  };
}

/** Set one ARIA property at runtime, e.g. as expanded state changes. */
export function setAria(el: HTMLElement, prop: string, value: string | null): void {
  const internals = internalsFor(el);
  if (!internals) return;
  try {
    (internals as Record<string, unknown>)[prop] = value;
  } catch {
    /* unsupported property on this browser */
  }
}
