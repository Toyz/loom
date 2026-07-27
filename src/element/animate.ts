/**
 * Loom — @animate
 *
 * The Web Animations API driven from a decorator, with the handle tracked so
 * the animation is cancelled when the component goes away.
 *
 * `element.animate()` returns an `Animation` that keeps running after the
 * element is detached; a component that starts one per connect and never
 * cancels leaks a live animation per mount. That is the bookkeeping this
 * exists to do -- the keyframes themselves are the platform's.
 *
 * ```ts
 * @component("pulse-dot")
 * class PulseDot extends LoomElement {
 *   @animate(".dot", [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }],
 *            { duration: 1500, iterations: Infinity })
 *   pulse!: () => Animation | null;
 *
 *   update() { return <span class="dot" />; }
 * }
 * ```
 *
 * Also usable imperatively via {@link animateElement}, which is the same
 * cancellation bookkeeping without a decorator.
 */

import { addConnectHook, hostElement } from "../decorators/symbols.js";

/** The subset of Animation we rely on, so this compiles without newer libs. */
export interface LoomAnimation {
  cancel(): void;
  finish(): void;
  play(): void;
  pause(): void;
  readonly finished?: Promise<unknown>;
}

export interface AnimateOptions {
  /** Start automatically on connect (default: true). */
  auto?: boolean;
}

/** True where element.animate() exists. */
export const supportsAnimations = (): boolean =>
  typeof Element !== "undefined" &&
  typeof (Element.prototype as { animate?: unknown }).animate === "function";

/**
 * Run keyframes on an element and get a cancel function back.
 *
 * Returns a no-op teardown where the Web Animations API is missing, so
 * callers never have to branch on support.
 */
export function animateElement(
  el: Element,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options?: number | KeyframeAnimationOptions,
): { animation: LoomAnimation | null; cancel: () => void } {
  const run = (el as { animate?: (k: unknown, o?: unknown) => LoomAnimation }).animate;
  if (typeof run !== "function") return { animation: null, cancel: () => {} };
  try {
    const animation = run.call(el, keyframes, options);
    return {
      animation,
      cancel: () => {
        try { animation.cancel(); } catch { /* already finished */ }
      },
    };
  } catch {
    return { animation: null, cancel: () => {} };
  }
}

/**
 * Animate an element in this component's shadow root.
 *
 * The decorated member becomes a function returning the running `Animation`
 * (or null where unsupported), so it can be paused, reversed or awaited.
 * With `auto: false` nothing runs until you call it.
 */
export function animate(
  selector: string,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options?: number | KeyframeAnimationOptions,
  opts: AnimateOptions = {},
) {
  return (_value: unknown, context: ClassFieldDecoratorContext | ClassMethodDecoratorContext) => {
    const auto = opts.auto ?? true;

    return function (this: unknown, initial?: unknown) {
      void initial;
      const host = this as HTMLElement;
      let current: { animation: LoomAnimation | null; cancel: () => void } | null = null;

      let running: Element | null = null;

      const start = (): LoomAnimation | null => {
        const root = (host as unknown as { shadowRoot?: ShadowRoot | null }).shadowRoot ?? host;
        const target = (root as ParentNode).querySelector(selector);
        if (!target) return null;
        current?.cancel();
        current = animateElement(target, keyframes, options);
        running = target;
        return current.animation;
      };

      addConnectHook(host, (el) => {
        void hostElement(el);

        // The target does not exist at connect -- the first render has not
        // happened yet -- so auto-start is deferred to after a render, and
        // re-checked on later ones in case the element was replaced.
        const maybeStart = () => {
          if (!auto) return;
          const root = (host as unknown as { shadowRoot?: ShadowRoot | null }).shadowRoot ?? host;
          const target = (root as ParentNode).querySelector(selector);
          if (!target || target === running) return;
          start();
        };

        const after = ((host as unknown as { __afterUpdate?: Array<() => void> }).__afterUpdate ??= []);
        after.push(maybeStart);
        maybeStart();

        // Cancel on disconnect: an Animation outlives the element it was
        // started on, so without this every mount leaks a running one.
        return () => {
          const i = after.indexOf(maybeStart);
          if (i !== -1) after.splice(i, 1);
          current?.cancel();
          current = null;
          running = null;
        };
      });

      // The field's value is the starter, so `this.pulse()` restarts it.
      void context;
      return start;
    };
  };
}
