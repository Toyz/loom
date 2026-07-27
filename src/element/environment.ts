/**
 * Loom — @visible and @online
 *
 * Read-only accessors backed by the shared signals in [env.ts](../env.ts).
 * Neither is a `Reactive`, so both force the render rather than relying on the
 * dirty check -- the same reason `@media` and `@consume` pass force.
 *
 * ```ts
 * @component("live-feed")
 * class LiveFeed extends LoomElement {
 *   @visible accessor visible = true;
 *   @online accessor online = true;
 *
 *   @api({ fn: fetchFeed, enabled: (el) => el.visible && el.online })
 *   accessor feed!: ApiState<Item[]>;
 * }
 * ```
 */

import { addConnectHook, hostElement } from "../decorators/symbols.js";
import { isVisible, onVisibilityChange, isOnline, onOnlineChange } from "../env.js";

/** Build a decorator that mirrors a shared environment signal. */
function envAccessor(read: () => boolean, subscribe: (fn: (v: boolean) => void) => () => void) {
  return (
    target: ClassAccessorDecoratorTarget<HTMLElement, boolean>,
    _context: ClassAccessorDecoratorContext<HTMLElement, boolean>,
  ): ClassAccessorDecoratorResult<HTMLElement, boolean> => ({
    get(this: HTMLElement) {
      return target.get.call(this);
    },
    set(this: HTMLElement, value: boolean) {
      // Writable so a test can drive it, but the environment wins on the next
      // change -- this reflects the browser, it does not control it.
      target.set.call(this, value);
    },
    init(this: HTMLElement, _value: boolean) {
      addConnectHook(this, (el) => {
        const host = hostElement(el);
        target.set.call(host, read());
        return subscribe((next) => {
          target.set.call(host, next);
          // Not Reactive-backed, so the trace-based skip cannot see it.
          (host as unknown as { scheduleUpdate?: (f?: boolean) => void }).scheduleUpdate?.(true);
        });
      });
      return read();
    },
  });
}

/**
 * True while the page is visible, false when the tab is hidden.
 *
 * The usual reason to want it: stop doing work nobody is looking at --
 * polling, animation, a live connection.
 */
export const visible = envAccessor(isVisible, onVisibilityChange);

/**
 * True while the browser believes it is online.
 *
 * `navigator.onLine` reports true for a machine on a network that cannot
 * reach anything, so treat false as reliable and true as a hint.
 */
export const online = envAccessor(isOnline, onOnlineChange);
