/**
 * Loom — @observer decorator
 *
 * Auto-managed DOM observers with lifecycle cleanup.
 * Creates the observer on connect, observes `this`, disconnects on unmount.
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
 * ```
 */

import { CONNECT_HOOKS } from "../decorators/symbols";

// ── Overloads ──

export function observer(
  type: "resize",
  options?: ResizeObserverOptions,
): (method: Function, context: ClassMethodDecoratorContext) => void;

export function observer(
  type: "intersection",
  options?: IntersectionObserverInit,
): (method: Function, context: ClassMethodDecoratorContext) => void;

export function observer(
  type: "mutation",
  options: MutationObserverInit,
): (method: Function, context: ClassMethodDecoratorContext) => void;

// ── Implementation ──

export function observer(
  type: "resize" | "intersection" | "mutation",
  options?: any,
) {
  return (method: Function, context: ClassMethodDecoratorContext) => {
    context.addInitializer(function (this: any) {
      if (!this[CONNECT_HOOKS]) this[CONNECT_HOOKS] = [];

      this[CONNECT_HOOKS].push((el: HTMLElement) => {
        const callback = (entries: any[]) => {
          for (const entry of entries) {
            method.call(el, entry);
          }
        };

        let obs: { disconnect(): void };

        switch (type) {
          case "resize": {
            const ro = new ResizeObserver(callback);
            ro.observe(el, options);
            obs = ro;
            break;
          }
          case "intersection": {
            const io = new IntersectionObserver(callback, options);
            io.observe(el);
            obs = io;
            break;
          }
          case "mutation": {
            const mo = new MutationObserver(callback);
            mo.observe(el, options);
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
