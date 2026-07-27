/**
 * Loom — @popover and @dialog
 *
 * Both put content in the browser's **top layer**, which is the part worth
 * having. An element in the top layer paints above everything regardless of
 * where it sits in the tree, so it does not need to be moved out of its
 * shadow root to escape a stacking context -- which is exactly what
 * [@portal](./portal.ts) exists to do, and why reaching for it is usually no
 * longer necessary.
 *
 * What the platform gives you here, and what people otherwise reimplement:
 * light dismiss, Escape to close, `::backdrop`, focus moved in and restored on
 * close, and -- for `showModal()` -- everything behind the dialog made inert.
 * The inert part in particular is the one hand-rolled versions almost always
 * get wrong, because it means finding and disabling every focusable element on
 * the page and putting them all back afterwards.
 *
 * ```ts
 * @component("my-menu")
 * class MyMenu extends LoomElement {
 *   @popover accessor open = false;
 *
 *   update() {
 *     return (
 *       <>
 *         <button onClick={() => (this.open = !this.open)}>Menu</button>
 *         <div popover="auto">...</div>
 *       </>
 *     );
 *   }
 * }
 * ```
 *
 * The accessor is the state and the DOM is the truth: dismissing with Escape
 * or a click outside writes `false` back, so the two cannot drift. That
 * write-back is the whole reason this is a decorator rather than a call to
 * `showPopover()` in a click handler.
 */

import { localSymbol, addConnectHook, hostElement } from "../decorators/symbols.js";

export interface OverlayOptions {
  /**
   * Selector for the overlay element inside the shadow root.
   *
   * Defaults to `[popover]` for popovers and `dialog` for dialogs, which is
   * what the markup already says -- a second declaration would only be
   * something to keep in sync.
   */
  target?: string;
}

export interface DialogOptions extends OverlayOptions {
  /**
   * Open with `showModal()` (default) or `show()`.
   *
   * Modal is the one that makes the rest of the page inert and renders a
   * `::backdrop`. Non-modal is a dialog that floats without trapping focus.
   */
  modal?: boolean;
}

/** Guard against the write-back loop: DOM event -> accessor -> DOM call. */
const SYNCING = localSymbol<boolean>("overlaySync");

const isSyncing = (host: object) => SYNCING.from(host) === true;
function withSync(host: object, fn: () => void) {
  SYNCING.set(host, true);
  try { fn(); } finally { SYNCING.set(host, false); }
}

/** Resolve the overlay element within the component's shadow root. */
function findTarget(host: HTMLElement, selector: string): HTMLElement | null {
  const root = (host as unknown as { shadowRoot?: ShadowRoot | null }).shadowRoot;
  return (root ?? host).querySelector<HTMLElement>(selector);
}

const supportsPopover = (el: HTMLElement): boolean =>
  typeof (el as unknown as { showPopover?: unknown }).showPopover === "function";

/**
 * Drive a `[popover]` element from a boolean accessor.
 *
 * ```ts
 * @popover accessor open = false;
 * @popover({ target: "#menu" }) accessor menuOpen = false;
 * ```
 *
 * Where the popover API is missing (Firefox before 125, older Safari) the
 * element's `hidden` property is toggled instead. The content still appears
 * and disappears; what is lost is the top layer, light dismiss and the
 * backdrop -- so it degrades to a plain conditional panel rather than to
 * nothing.
 */
export function popover(...args: unknown[]): any {
  return makeOverlay(args, {
    defaultTarget: "[popover]",
    open(el) {
      if (supportsPopover(el)) {
        // Already-open throws InvalidStateError; opening twice is a normal
        // consequence of state being re-applied after a render.
        try { (el as unknown as { showPopover(): void }).showPopover(); } catch { /* already open */ }
      } else {
        el.hidden = false;
      }
    },
    close(el) {
      if (supportsPopover(el)) {
        try { (el as unknown as { hidePopover(): void }).hidePopover(); } catch { /* already closed */ }
      } else {
        el.hidden = true;
      }
    },
    /** `toggle` fires for light dismiss and Escape as well as our own calls. */
    listen(el, onChange) {
      const handler = (e: Event) => {
        onChange((e as unknown as { newState?: string }).newState === "open");
      };
      el.addEventListener("toggle", handler);
      return () => el.removeEventListener("toggle", handler);
    },
  });
}

/**
 * Drive a `<dialog>` from a boolean accessor.
 *
 * ```ts
 * @dialog accessor confirmOpen = false;
 * @dialog({ modal: false }) accessor toastOpen = false;
 * ```
 *
 * Modal by default, so the rest of the page is inert and a `::backdrop`
 * renders. Escape and a `<form method="dialog">` submit both close the dialog
 * natively, and both write `false` back to the accessor.
 */
export function dialog(...args: unknown[]): any {
  const opts = (typeof args[0] === "object" && args[0] !== null && !("kind" in (args[1] as object ?? {}))
    ? args[0]
    : {}) as DialogOptions;

  return makeOverlay(args, {
    defaultTarget: "dialog",
    open(el) {
      const d = el as unknown as { showModal?(): void; show?(): void; open?: boolean };
      if (d.open) return;
      try {
        if (opts.modal === false) d.show?.();
        else d.showModal?.();
      } catch {
        // showModal throws if the dialog is not connected yet. The state is
        // re-applied after the next render, which is when it will be.
      }
    },
    close(el) {
      const d = el as unknown as { close?(): void; open?: boolean };
      if (d.open === false) return;
      try { d.close?.(); } catch { /* already closed */ }
    },
    listen(el, onChange) {
      const onClose = () => onChange(false);
      el.addEventListener("close", onClose);
      // `cancel` is Escape. It precedes `close`, but listening to both means
      // the state is right even if something calls preventDefault on one.
      el.addEventListener("cancel", onClose);

      /* The events are not sufficient on their own. A `<form method="dialog">`
         submit closes the dialog *without firing `close`* when the dialog is
         inside a shadow root -- verified against Chrome with the same markup in
         both trees: light DOM fires it, shadow DOM does not. Every Loom
         component renders into a shadow root, so that is the normal case here,
         not the exotic one.
    
         Left on the events alone, the dialog closes and the accessor keeps
         saying it is open: the next render re-applies that state and the modal
         comes back, or the button stops responding because the value never
         changed. Watching the attribute catches it however the dialog closed,
         since `open` is what the browser actually removes. */
      const MO = (globalThis as { MutationObserver?: typeof MutationObserver }).MutationObserver;
      const observer = typeof MO === "function"
        ? new MO(() => { if (!el.hasAttribute("open")) onChange(false); })
        : null;
      observer?.observe(el, { attributes: true, attributeFilter: ["open"] });

      return () => {
        el.removeEventListener("close", onClose);
        el.removeEventListener("cancel", onClose);
        observer?.disconnect();
      };
    },
  });
}

interface OverlayDriver {
  defaultTarget: string;
  open(el: HTMLElement): void;
  close(el: HTMLElement): void;
  listen(el: HTMLElement, onChange: (open: boolean) => void): () => void;
}

/**
 * Shared machinery: an accessor whose value is pushed to the DOM, and whose
 * value is written back when the DOM changes it on its own.
 */
function makeOverlay(args: unknown[], driver: OverlayDriver): any {
  const bare = typeof args[0] === "object" && args[0] !== null && "get" in (args[0] as object);
  const opts = (bare ? {} : (args[0] ?? {})) as OverlayOptions;
  const selector = opts.target ?? driver.defaultTarget;

  const decorate = (
    target: ClassAccessorDecoratorTarget<HTMLElement, boolean>,
    context: ClassAccessorDecoratorContext<HTMLElement, boolean>,
  ): ClassAccessorDecoratorResult<HTMLElement, boolean> => {
    void context;

    /** Push the accessor's value at the DOM, if the element exists yet. */
    const apply = (host: HTMLElement, open: boolean) => {
      const el = findTarget(host, selector);
      if (!el) return;
      withSync(host, () => (open ? driver.open(el) : driver.close(el)));
    };

    return {
      get(this: HTMLElement) {
        return target.get.call(this);
      },
      set(this: HTMLElement, value: boolean) {
        target.set.call(this, value);
        // A DOM-originated change already reflects the DOM; calling back into
        // it would be a no-op at best and a loop at worst.
        if (!isSyncing(this)) apply(this, value);
      },
      init(this: HTMLElement, value: boolean) {
        addConnectHook(this, (el) => {
          const host = hostElement(el);
          let unlisten: (() => void) | null = null;

          // The overlay element only exists after the first render, and it can
          // be replaced by a later one, so binding is re-checked each pass
          // rather than done once.
          let bound: HTMLElement | null = null;

          const bind = () => {
            const node = findTarget(host, selector);
            if (!node || (node as { __loomOverlayBound?: boolean }).__loomOverlayBound) return;

            // A render can replace the overlay element. If the outgoing one
            // was an open modal it still holds the top layer, so the page
            // stays inert behind a dialog that is no longer in the document --
            // a frozen tab with nothing on screen to dismiss.
            if (bound && bound !== node) {
              withSync(host, () => driver.close(bound!));
            }
            bound = node;

            (node as { __loomOverlayBound?: boolean }).__loomOverlayBound = true;
            unlisten?.();
            unlisten = driver.listen(node, (open) => {
              // Light dismiss, Escape, or a dialog form submit. Write it back
              // through the accessor -- inside the guard, so the setter does
              // not turn around and call the DOM again -- and re-render.
              withSync(host, () => target.set.call(host, open));
              (host as unknown as { scheduleUpdate?: (f?: boolean) => void }).scheduleUpdate?.(true);
            });
            // Apply the state the accessor already holds to the fresh element.
            apply(host, target.get.call(host));
          };

          const after = ((host as unknown as { __afterUpdate?: Array<() => void> }).__afterUpdate ??= []);
          after.push(bind);
          bind();

          return () => {
            unlisten?.();
            const i = after.indexOf(bind);
            if (i !== -1) after.splice(i, 1);
            // Leaving an open dialog in the top layer after its component is
            // gone would keep the page inert with nothing to dismiss.
            const node = findTarget(host, selector) ?? bound;
            if (node) withSync(host, () => driver.close(node));
            bound = null;
          };
        });
        return value;
      },
    };
  };

  if (bare) {
    return decorate(
      args[0] as ClassAccessorDecoratorTarget<HTMLElement, boolean>,
      args[1] as ClassAccessorDecoratorContext<HTMLElement, boolean>,
    );
  }
  return decorate;
}
