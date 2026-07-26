/**
 * Loom — @permission decorator
 *
 * Reactive binding to the Permissions API, in the shape of `@media`: the
 * field tracks the current state, re-renders when it changes, and unsubscribes
 * on disconnect.
 *
 * ```ts
 * @permission("geolocation")
 * accessor geo: LoomPermissionState = "prompt";
 *
 * update() {
 *   if (this.geo === "denied") return <p>Location is blocked in site settings.</p>;
 *   return <button onClick={() => this.locate()}>Use my location</button>;
 * }
 * ```
 *
 * What this is for: knowing the state *before* you trigger the API, so the UI
 * can be honest. A denied permission is not recoverable from script — the only
 * fix is site settings — so a button that will always fail is worse than an
 * explanation. And "prompt" is the moment to say why you are about to ask,
 * which is the difference between a granted and a dismissed prompt.
 *
 * What it is not: a way to avoid the prompt. Querying never grants anything
 * and never suppresses anything.
 */

import { addConnectHook } from "../decorators/symbols";

/**
 * `PermissionState`, plus the case the spec leaves you to discover at runtime.
 *
 * `navigator.permissions` is absent in some browsers, and `query()` rejects
 * with a TypeError for names a given engine does not implement — "camera" in
 * Firefox, for one. Both are reported as `"unsupported"` rather than guessed
 * at, because "denied" and "cannot tell" call for different UI: the first is
 * a dead end, the second means try it and handle the failure.
 */
export type LoomPermissionState = PermissionState | "unsupported";

/**
 * @permission(name) — accessor decorator.
 *
 * Binds the field to `navigator.permissions.query({ name })`. Resolution is
 * async, so the field holds its declared initial value until the first answer
 * arrives; declare it `"prompt"` unless you have a reason not to.
 *
 * @param name A `PermissionName`, e.g. `"geolocation"`, `"notifications"`,
 *   `"clipboard-read"`, `"camera"`, `"microphone"`, `"push"`.
 */
export function permission(name: PermissionName | string) {
  return function (
    _target: ClassAccessorDecoratorTarget<any, LoomPermissionState>,
    context: ClassAccessorDecoratorContext,
  ): ClassAccessorDecoratorResult<any, LoomPermissionState> {
    const fieldName = context.name as string;
    const storageKey = `__permission_${fieldName}`;

    context.addInitializer(function (this: any) {
      addConnectHook(this, (_el: HTMLElement) => {
        const perms = (navigator as Navigator).permissions;
        if (!perms?.query) {
          this[storageKey] = "unsupported";
          this.scheduleUpdate?.(true);
          return;
        }

        // Disconnect can happen before the query resolves, and the listener
        // must not be attached in that case — nor the field written on a
        // detached element.
        let status: PermissionStatus | null = null;
        let cancelled = false;

        const onChange = () => {
          if (cancelled || !status) return;
          this[storageKey] = status.state;
          this.scheduleUpdate?.(true);
        };

        perms
          .query({ name: name as PermissionName })
          .then((s) => {
            if (cancelled) return;
            status = s;
            this[storageKey] = s.state;
            this.scheduleUpdate?.(true);
            s.addEventListener("change", onChange);
          })
          .catch(() => {
            // query() rejects for names the engine does not implement.
            if (cancelled) return;
            this[storageKey] = "unsupported";
            this.scheduleUpdate?.(true);
          });

        return () => {
          cancelled = true;
          status?.removeEventListener("change", onChange);
        };
      });
    });

    return {
      init(value: LoomPermissionState): LoomPermissionState {
        // Kept, unlike @media's: the answer is async, and what the component
        // shows in the meantime is the author's call.
        return value ?? "prompt";
      },

      set(this: any, value: LoomPermissionState) {
        this[storageKey] = value;
      },

      get(this: any): LoomPermissionState {
        return this[storageKey] ?? "prompt";
      },
    };
  };
}
