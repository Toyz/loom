/**
 * Loom — @fullscreen decorator
 *
 * Accessor decorator that binds a boolean field to the Fullscreen API.
 * Setting to `true` calls `requestFullscreen()`, `false` calls `exitFullscreen()`.
 * Listens for `fullscreenchange` events to keep the field in sync.
 *
 * ```ts
 * @fullscreen()
 * accessor isFullscreen = false;
 *
 * // With options
 * @fullscreen({ navigationUI: "hide" })
 * accessor isFullscreen = false;
 * ```
 */

import { CONNECT_HOOKS } from "../decorators/symbols";

export interface FullscreenOptions {
  /** Navigation UI preference for requestFullscreen */
  navigationUI?: "auto" | "hide" | "show";
}

/**
 * @fullscreen(opts?) — Accessor decorator
 *
 * Binds a boolean accessor to the Fullscreen API.
 * Toggling the field enters/exits fullscreen. The field stays in sync
 * with external fullscreen changes (e.g., user presses Escape).
 */
export function fullscreen(opts?: FullscreenOptions) {
  return function (
    _target: ClassAccessorDecoratorTarget<any, boolean>,
    context: ClassAccessorDecoratorContext,
  ): ClassAccessorDecoratorResult<any, boolean> {
    const fieldName = context.name as string;
    const storageKey = `__fs_${fieldName}`;

    context.addInitializer(function (this: any) {
      if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];

      this[CONNECT_HOOKS.key].push((el: HTMLElement) => {
        // Sync field when fullscreen changes externally (e.g., Escape key)
        const handler = () => {
          const isFs = document.fullscreenElement === el;
          this[storageKey] = isFs;
          this.scheduleUpdate?.();
        };

        document.addEventListener("fullscreenchange", handler);

        return () => {
          document.removeEventListener("fullscreenchange", handler);
          // Exit fullscreen if component disconnects while fullscreen
          if (document.fullscreenElement === el) {
            document.exitFullscreen?.();
          }
        };
      });
    });

    return {
      init(_value: boolean): boolean {
        return false;
      },

      set(this: any, value: boolean) {
        const prev = this[storageKey];
        this[storageKey] = value;

        if (value && !prev) {
          // Entering fullscreen
          (this as HTMLElement).requestFullscreen?.(opts);
        } else if (!value && prev) {
          // Exiting fullscreen
          if (document.fullscreenElement === this) {
            document.exitFullscreen?.();
          }
        }
      },

      get(this: any): boolean {
        return this[storageKey] ?? false;
      },
    };
  };
}
