/**
 * Loom — @media decorator
 *
 * Reactive media-query binding for accessor fields.
 * Creates a `matchMedia` listener on connect, cleans up on disconnect.
 * The field auto-updates when the media query match state changes.
 *
 * ```ts
 * @media("(max-width: 768px)")
 * accessor isMobile = false;
 *
 * @media("(prefers-color-scheme: dark)")
 * accessor prefersDark = false;
 *
 * @media("(min-width: 1024px) and (orientation: landscape)")
 * accessor isDesktop = false;
 * ```
 */

import { CONNECT_HOOKS } from "../decorators/symbols";

/**
 * @media(query) — Accessor decorator
 *
 * Binds a boolean accessor to a CSS media query via `matchMedia`.
 * The field is set to `true`/`false` on connect and updated reactively
 * whenever the match state changes. Cleanup is automatic on disconnect.
 */
export function media(query: string) {
  return function (
    _target: ClassAccessorDecoratorTarget<any, boolean>,
    context: ClassAccessorDecoratorContext,
  ): ClassAccessorDecoratorResult<any, boolean> {
    const fieldName = context.name as string;
    const storageKey = `__media_${fieldName}`;

    context.addInitializer(function (this: any) {
      if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];

      this[CONNECT_HOOKS.key].push((_el: HTMLElement) => {
        const mql = window.matchMedia(query);

        // Set initial value from current match state
        this[storageKey] = mql.matches;
        this.scheduleUpdate?.();

        // Listen for changes
        const handler = (e: MediaQueryListEvent) => {
          this[storageKey] = e.matches;
          this.scheduleUpdate?.();
        };

        mql.addEventListener("change", handler);

        // Return cleanup — runs on disconnectedCallback
        return () => mql.removeEventListener("change", handler);
      });
    });

    return {
      init(_value: boolean): boolean {
        return false; // Will be set from matchMedia on connect
      },

      set(this: any, value: boolean) {
        this[storageKey] = value;
      },

      get(this: any): boolean {
        return this[storageKey] ?? false;
      },
    };
  };
}
