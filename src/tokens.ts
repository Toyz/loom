/**
 * Loom — design tokens
 *
 * The loudest thing in a component's stylesheet is usually not the CSS. It is
 * `var(--text-muted, #6d6858)` written out again for every property that wants
 * a colour, with the fallback repeated each time.
 *
 * The repetition is not just noise. Because each copy is written by hand, the
 * fallbacks drift, and a fallback only renders when the token is undefined --
 * which is exactly when nobody is looking. What accumulates is a second,
 * contradictory palette hiding behind the real one: in this repo's own docs,
 * `--text-muted` had picked up five different fallbacks and `--accent` two
 * unrelated purples across 479 occurrences. Whichever file you happened to
 * render decided what a missing token looked like.
 *
 * `tokens()` declares each value once and hands back the `var()` strings:
 *
 * ```ts
 * export const t = tokens({
 *   ground:    "#14140f",
 *   thread:    "#c4472f",
 *   textMuted: "#6d6858",
 * });
 *
 * const styles = css`
 *   :host  { background: ${t.ground}; color: ${t.textMuted}; }
 *   button { border: 1px solid ${t.thread}; }
 * `;
 * ```
 *
 * Shorter to write, autocompleted, and there is one place a fallback can be
 * wrong. `t.$sheet` emits the custom properties themselves, so the definition
 * and the fallback cannot disagree -- they are the same literal.
 */

import { css } from "./css.js";

/**
 * camelCase -> kebab-case, so `textMuted` reads as `--text-muted`.
 *
 * Digits start a new part too: a scale is almost always written `--space-1`
 * and `--text-2xl`, so `space1` has to reach `--space-1` or the token silently
 * refers to a property nobody declared -- and a token that resolves to nothing
 * is invisible, because the fallback quietly covers for it.
 */
function kebab(name: string): string {
  return name
    .replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())
    .replace(/([a-z])(\d)/g, "$1-$2");
}

/**
 * What a token set exposes beyond the tokens themselves.
 *
 * `$`-prefixed so it cannot collide with a token name -- and token names
 * starting with `$` are rejected for the same reason.
 */
export interface TokenExtras<T extends Record<string, string | number>> {
  /**
   * A stylesheet declaring every token on `:host`.
   *
   * Adopt it in a root component, or use `$sheetFor(":root")` for the page.
   * Because it is generated from the same literals as the fallbacks, the
   * declaration and the fallback are the same value by construction.
   */
  readonly $sheet: CSSStyleSheet;
  /** The same declarations, on a selector you choose. */
  $sheetFor(selector: string): CSSStyleSheet;
  /**
   * The literal values, unwrapped.
   *
   * `var()` is a CSS concept: a canvas 2D context, a `<meta name="theme-color">`
   * or anything comparing colours in JS needs the actual value. Reaching for
   * the hex directly is what re-introduces the drift, so it is available here
   * rather than being retyped.
   */
  readonly $value: Readonly<T>;
  /** The custom property name for a token, e.g. `"--text-muted"`. */
  $name(token: keyof T): string;
}

/** A token set: every key resolves to its `var()` reference. */
export type Tokens<T extends Record<string, string | number>> =
  { readonly [K in keyof T]: string } & TokenExtras<T>;

/**
 * Declare a set of design tokens.
 *
 * Each key becomes a `var(--kebab-name, <value>)` string, so the fallback is
 * written once and every use site gets it.
 *
 * @param values token name -> value. Names are camelCase; `--kebab-case` is
 *   what lands in the CSS.
 */
export function tokens<T extends Record<string, string | number>>(values: T): Tokens<T> {
  const out = {} as Record<string, unknown>;
  const names = {} as Record<string, string>;

  for (const key of Object.keys(values)) {
    if (key.startsWith("$")) {
      throw new Error(
        `[loom] tokens: "${key}" cannot start with "$" -- that prefix is reserved ` +
        `for $sheet, $value and $name.`,
      );
    }
    const prop = "--" + kebab(key);
    names[key] = prop;
    out[key] = `var(${prop}, ${values[key]})`;
  }

  const declarations = Object.keys(values)
    .map((k) => `  ${names[k]}: ${values[k]};`)
    .join("\n");

  const sheetFor = (selector: string): CSSStyleSheet =>
    css`${selector} {\n${declarations}\n}`;

  out.$sheetFor = sheetFor;
  out.$value = Object.freeze({ ...values });
  out.$name = (token: keyof T) => names[token as string]!;

  // Built eagerly: a token set is module-level, and a getter here would only
  // move the same work to first paint.
  out.$sheet = sheetFor(":host");

  return Object.freeze(out) as Tokens<T>;
}
