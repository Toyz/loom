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
 * Known permission names, so a call site does not depend on remembering a
 * magic string.
 *
 * The first group is everything in the DOM lib's own `PermissionName` union.
 * The second is widely implemented but not in that union, which is why the
 * decorator accepts a plain string as well — the registry is for discovery
 * and spelling, not a gate. A name no engine implements simply reports
 * `"unsupported"`, the same as one that is merely absent here.
 *
 * ```ts
 * @permission(Permission.Geolocation) accessor geo: LoomPermissionState = "prompt";
 * @permission("compute-pressure")     accessor cpu: LoomPermissionState = "prompt";
 * ```
 */
export const Permission = {
  // In lib.dom's PermissionName
  Camera: "camera",
  Geolocation: "geolocation",
  Microphone: "microphone",
  Midi: "midi",
  Notifications: "notifications",
  PersistentStorage: "persistent-storage",
  Push: "push",
  ScreenWakeLock: "screen-wake-lock",
  StorageAccess: "storage-access",

  // Implemented by engines, absent from that union
  ClipboardRead: "clipboard-read",
  ClipboardWrite: "clipboard-write",
  Accelerometer: "accelerometer",
  AmbientLightSensor: "ambient-light-sensor",
  BackgroundSync: "background-sync",
  Bluetooth: "bluetooth",
  DisplayCapture: "display-capture",
  Gyroscope: "gyroscope",
  IdleDetection: "idle-detection",
  LocalFonts: "local-fonts",
  Magnetometer: "magnetometer",
  Nfc: "nfc",
  PaymentHandler: "payment-handler",
  PeriodicBackgroundSync: "periodic-background-sync",
  SpeakerSelection: "speaker-selection",
  WindowManagement: "window-management",
} as const;

/** Any value of {@link Permission}. */
export type PermissionKey = (typeof Permission)[keyof typeof Permission];

/**
 * What `@permission` accepts.
 *
 * `string & {}` keeps the known names in autocomplete while still allowing
 * anything — a plain `string` in the union would collapse the literals and
 * suggest nothing.
 */
export type PermissionNameLike = PermissionKey | PermissionName | (string & {});



/**
 * The four states, so a comparison does not depend on a literal either.
 *
 * ```ts
 * if (this.geo === PermissionState.Denied) { ... }
 * ```
 *
 * Note this shadows the DOM lib's `PermissionState` type in any module that
 * imports it. That is intended: Loom's set has a fourth member the DOM type
 * does not, and in a module using this decorator Loom's is the one you want.
 * The type is exported as {@link LoomPermissionState}.
 */
export const PermissionState = {
  Granted: "granted",
  Denied: "denied",
  Prompt: "prompt",
  /** No answer available — see {@link LoomPermissionState}. */
  Unsupported: "unsupported",
} as const;

/* ── Predicates ──
   The rules these encode are the whole reason the four states are not three.
   Written out at each call site they get re-derived, and "unsupported" is the
   one people get wrong: it is not a refusal. */

/** Granted outright — proceed with no interruption. */
export function isGranted(state: LoomPermissionState): boolean {
  return state === "granted";
}

/**
 * A dead end. Nothing in the page can undo this — only site settings — so
 * offer an explanation rather than a control that cannot work.
 */
export function isBlocked(state: LoomPermissionState): boolean {
  return state === "denied";
}

/**
 * Using the API will raise a prompt. The moment to say why you are asking,
 * before the browser asks, which is the difference between a granted
 * permission and a dismissed one.
 */
export function willPrompt(state: LoomPermissionState): boolean {
  return state === "prompt";
}

/**
 * Worth attempting: everything except a refusal.
 *
 * Deliberately includes `"unsupported"`. The browser declining to answer in
 * advance is not the browser saying no, and treating it as no is how a
 * feature gets disabled on engines where it would have worked.
 */
export function canAttempt(state: LoomPermissionState): boolean {
  return state !== "denied";
}

/**
 * @permission(name) — accessor decorator.
 *
 * Binds the field to `navigator.permissions.query({ name })`. Resolution is
 * async, so the field holds its declared initial value until the first answer
 * arrives; declare it `"prompt"` unless you have a reason not to.
 *
 * @param name A value of {@link Permission}, or any permission string. Names
 *   the engine does not implement report `"unsupported"`.
 */
export function permission(name: PermissionNameLike) {
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
