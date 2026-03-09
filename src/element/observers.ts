/**
 * Loom — @observer decorator
 *
 * Auto-managed DOM observers with lifecycle cleanup.
 * Creates the observer on connect, observes `this` (or a resolved target), disconnects on unmount.
 *
 * ```ts
 * @observer("resize")
 * onResize(entry: ResizeObserverEntry) {
 *   const { width, height } = entry.contentRect;
 *   // ...
 * }
 *
 * @observer("intersection", { threshold: 0.5 })
 * onVisible(entry: IntersectionObserverEntry) {
 *   if (entry.isIntersecting) this.load();
 * }
 *
 * @observer("mutation", { childList: true, subtree: true })
 * onChildChange(record: MutationRecord) {
 *   this.recount();
 * }
 *
 * // With target resolver — observe a different node
 * @observer("mutation", { childList: true, subtree: true }, el => el.getRootNode())
 * onParentChange(record: MutationRecord) {
 *   this.rescan();
 * }
 * ```
 */

import { CONNECT_HOOKS } from "../decorators/symbols";

/** Resolver that selects the observe target from the component instance. */
type TargetResolver = (el: HTMLElement) => Node | Element | null | undefined;

/** Maps observer type → its options type */
interface ObserverOptionsMap {
  resize:       ResizeObserverOptions;
  intersection: IntersectionObserverInit;
  mutation:     MutationObserverInit;
}

// ── Overloads ──

export function observer(
  type: "resize",
  options?: ResizeObserverOptions,
  target?: TargetResolver,
): (method: Function, context: ClassMethodDecoratorContext) => void;

export function observer(
  type: "intersection",
  options?: IntersectionObserverInit,
  target?: TargetResolver,
): (method: Function, context: ClassMethodDecoratorContext) => void;

export function observer(
  type: "mutation",
  options: MutationObserverInit,
  target?: TargetResolver,
): (method: Function, context: ClassMethodDecoratorContext) => void;

// ── Implementation ──

export function observer<T extends keyof ObserverOptionsMap>(
  type: T,
  options?: ObserverOptionsMap[T],
  target?: TargetResolver,
) {
  return (method: Function, context: ClassMethodDecoratorContext) => {
    context.addInitializer(function (this: any) {
      if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];

      this[CONNECT_HOOKS.key].push((el: HTMLElement) => {
        const observeTarget = target ? target(el) : el;
        if (!observeTarget) return;

        const callback = (entries: any[]) => {
          for (const entry of entries) {
            method.call(el, entry);
          }
        };

        let obs: { disconnect(): void };

        switch (type) {
          case "resize": {
            const ro = new ResizeObserver(callback);
            ro.observe(observeTarget as Element, options as ResizeObserverOptions);
            obs = ro;
            break;
          }
          case "intersection": {
            const io = new IntersectionObserver(callback, options as IntersectionObserverInit);
            io.observe(observeTarget as Element);
            obs = io;
            break;
          }
          case "mutation": {
            const mo = new MutationObserver(callback);
            mo.observe(observeTarget, options as MutationObserverInit);
            obs = mo;
            break;
          }
        }

        // Return cleanup — runs on disconnectedCallback
        return () => obs.disconnect();
      });
    });
  };
}
