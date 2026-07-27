/**
 * Loom — form-associated custom elements
 *
 * A custom element only participates in a `<form>` if its constructor declares
 * `static formAssociated = true` before the element is defined. Without it the
 * component is furniture: it submits nothing, `form.elements` does not list it,
 * validation skips it, and reset leaves it alone. `@form` handles the state,
 * deliberately without touching the DOM -- so nothing in Loom ever made a
 * component visible to the form it was sitting in.
 *
 * ```ts
 * @component("my-field", { formAssociated: true })
 * class MyField extends LoomElement {
 *   @formValue accessor value = "";
 *
 *   @validity((v: string) => v.includes("@") || "Enter an email address")
 *   accessor email = "";
 * }
 * ```
 *
 * `<form>` then sees `my-field` as a control: the value submits under the
 * element's `name`, `form.checkValidity()` includes it, and a reset restores
 * the value the component started with.
 */

import { localSymbol, addConnectHook, hostElement } from "../decorators/symbols.js";
import { internalsFor, type FormValue } from "./internals.js";

/** Fields registered by @formValue / @validity, per constructor. */
interface ControlMeta {
  /** Accessor whose value is submitted. */
  valueKey?: string;
  /** Validators, in declaration order. */
  validators: Array<{ key: string; fn: Validator }>;
}

/** Returns true when valid, or a message describing why it is not. */
export type Validator = (value: any, host: any) => boolean | string;

const META = new WeakMap<Function, ControlMeta>();

function metaFor(ctor: Function): ControlMeta {
  let m = META.get(ctor);
  if (!m) META.set(ctor, (m = { validators: [] }));
  return m;
}

/** Own metadata for a class, copying an inherited list rather than sharing it. */
function ownMeta(ctor: Function): ControlMeta {
  const existing = META.get(ctor);
  if (existing) return existing;
  // Walk up: a subclass inherits its base's controls but must not mutate them.
  let proto = Object.getPrototypeOf(ctor) as Function | null;
  while (proto) {
    const inherited = META.get(proto);
    if (inherited) {
      const copy: ControlMeta = {
        valueKey: inherited.valueKey,
        validators: inherited.validators.slice(),
      };
      META.set(ctor, copy);
      return copy;
    }
    proto = Object.getPrototypeOf(proto) as Function | null;
  }
  return metaFor(ctor);
}

const DEFAULT_VALUE = localSymbol<unknown>("formDefault");

/** Serialise whatever the accessor holds into something a form can submit. */
function toFormValue(value: unknown): FormValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "on" : null; // checkbox semantics
  if (value instanceof File || value instanceof FormData) return value;
  return String(value);
}

/**
 * Submit this accessor's value with the surrounding form.
 *
 * ```ts
 * @formValue accessor value = "";
 * ```
 *
 * The value goes out under the host element's `name` attribute, exactly as a
 * native control's would. Booleans follow checkbox semantics -- `"on"` when
 * true, absent when false -- so a toggle round-trips through a form without
 * the author writing a serialiser.
 */
export function formValue<This extends HTMLElement, V>(
  target: ClassAccessorDecoratorTarget<This, V>,
  context: ClassAccessorDecoratorContext<This, V>,
): ClassAccessorDecoratorResult<This, V> {
  const key = String(context.name);

  context.addInitializer(function (this: This) {
    ownMeta(this.constructor as Function).valueKey = key;
  });

  return {
    get(this: This) {
      return target.get.call(this);
    },
    set(this: This, value: V) {
      target.set.call(this, value);
      internalsFor(this)?.setFormValue?.(toFormValue(value));
      revalidate(this);
    },
    init(this: This, value: V) {
      // Remembered for formResetCallback: a reset restores what the component
      // was constructed with, which is what a native control does.
      DEFAULT_VALUE.set(this, value);
      addConnectHook(this, (el) => {
        const host = hostElement(el) as This;
        internalsFor(host)?.setFormValue?.(toFormValue(target.get.call(host)));
        revalidate(host);
      });
      return value;
    },
  };
}

/**
 * Attach a validator to an accessor.
 *
 * ```ts
 * @validity((v: string) => v.length >= 8 || "At least 8 characters")
 * accessor password = "";
 * ```
 *
 * Returning `true` means valid; returning a string means invalid and is the
 * message the browser shows. The result is reported through
 * `internals.setValidity`, so `form.checkValidity()`, `:invalid` and the
 * browser's own validation bubble all work without further wiring.
 */
export function validity<This extends HTMLElement, V>(fn: Validator) {
  return (
    target: ClassAccessorDecoratorTarget<This, V>,
    context: ClassAccessorDecoratorContext<This, V>,
  ): ClassAccessorDecoratorResult<This, V> => {
    const key = String(context.name);

    context.addInitializer(function (this: This) {
      const meta = ownMeta(this.constructor as Function);
      if (!meta.validators.some((v) => v.key === key)) {
        meta.validators.push({ key, fn });
      }
    });

    return {
      get(this: This) {
        return target.get.call(this);
      },
      set(this: This, value: V) {
        target.set.call(this, value);
        revalidate(this);
      },
      init(this: This, value: V) {
        addConnectHook(this, (el) => revalidate(hostElement(el) as This));
        return value;
      },
    };
  };
}

/**
 * Re-run every validator and report the first failure.
 *
 * One `setValidity` call for the element as a whole, because that is the unit
 * the form works in -- a control is valid or it is not, and the message shown
 * is the first reason it is not.
 */
export function revalidate(host: HTMLElement): void {
  const internals = internalsFor(host);
  if (!internals?.setValidity) return;

  const meta = META.get(host.constructor as Function);
  if (!meta || !meta.validators.length) {
    internals.setValidity({});
    return;
  }

  for (const { key, fn } of meta.validators) {
    let result: boolean | string;
    try {
      result = fn((host as unknown as Record<string, unknown>)[key], host);
    } catch (e) {
      result = e instanceof Error ? e.message : String(e);
    }
    if (result !== true) {
      const message = typeof result === "string" ? result : "Invalid";
      // customError, not valueMissing: the constraint came from the component,
      // and reporting it as a built-in flag would lie about which one failed.
      internals.setValidity({ customError: true }, message);
      return;
    }
  }
  internals.setValidity({});
}

/**
 * Install the form-associated callbacks on a constructor.
 *
 * Called by `@component(tag, { formAssociated: true })`. Separate from the
 * decorator so the behaviour is testable without defining a custom element.
 */
export function makeFormAssociated(ctor: Function): void {
  (ctor as unknown as { formAssociated: boolean }).formAssociated = true;

  const proto = ctor.prototype as Record<string, unknown>;

  // Reset restores the constructed value, matching a native control.
  if (!proto.formResetCallback) {
    proto.formResetCallback = function (this: HTMLElement) {
      const meta = META.get(this.constructor as Function);
      const key = meta?.valueKey;
      if (key) {
        const initial = DEFAULT_VALUE.from(this);
        (this as unknown as Record<string, unknown>)[key] = initial;
      }
      revalidate(this);
    };
  }

  // The browser calls this when a form is restored from bfcache or autofill.
  if (!proto.formStateRestoreCallback) {
    proto.formStateRestoreCallback = function (this: HTMLElement, restored: string) {
      const meta = META.get(this.constructor as Function);
      if (meta?.valueKey) {
        (this as unknown as Record<string, unknown>)[meta.valueKey] = restored;
      }
    };
  }

  // Disabled state propagates from a wrapping <fieldset disabled>, which the
  // component cannot see any other way.
  if (!proto.formDisabledCallback) {
    proto.formDisabledCallback = function (this: HTMLElement, disabled: boolean) {
      if (disabled) this.setAttribute("aria-disabled", "true");
      else this.removeAttribute("aria-disabled");
    };
  }
}

// ── Public helpers on the element -------------------------------------------

/** The form this element belongs to, if any. */
export const formOf = (el: HTMLElement): HTMLFormElement | null =>
  internalsFor(el)?.form ?? null;

/** Whether the element currently satisfies its validators. */
export const checkValidity = (el: HTMLElement): boolean =>
  internalsFor(el)?.checkValidity?.() ?? true;

/** Like checkValidity, but shows the browser's validation message. */
export const reportValidity = (el: HTMLElement): boolean =>
  internalsFor(el)?.reportValidity?.() ?? true;

/** The current validation message, empty when valid. */
export const validationMessage = (el: HTMLElement): string =>
  internalsFor(el)?.validationMessage ?? "";
