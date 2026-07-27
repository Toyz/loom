/**
 * Loom — View Transitions
 *
 * `document.startViewTransition(mutate)` snapshots the page, runs `mutate`,
 * snapshots again, and cross-fades the difference. What it wants is one
 * synchronous DOM mutation between the two snapshots.
 *
 * That is precisely what Loom's renderer already is. [morph.ts](../morph.ts)
 * has a single entry point and applies the whole update in one synchronous
 * pass, so there is an exact moment to hand the browser. Frameworks that
 * commit through a chunked, interruptible scheduler have to fight for the same
 * guarantee; here it falls out of the architecture.
 *
 * ```ts
 * @component("my-list")
 * @viewTransition
 * class MyList extends LoomElement { }
 * ```
 *
 * Every full render of that component is then wrapped. Fast-patches are not:
 * a text or attribute patch is not a structural change, and animating one
 * would mean paying for a full-page snapshot to fade a number.
 */

import { localSymbol } from "../decorators/symbols.js";

/** The subset of the spec's ViewTransition we depend on. */
export interface ViewTransitionHandle {
  /**
   * Resolves once the pseudo-elements are built and the animation is about to
   * run. Rejects if the transition is skipped before it gets that far -- which
   * is normal, and why nothing should leave this promise unhandled.
   */
  readonly ready?: Promise<void>;
  /** Resolves once the animation has finished (or immediately if skipped). */
  readonly finished: Promise<void>;
  /** Resolves once the DOM has been updated, before the animation runs. */
  readonly updateCallbackDone: Promise<void>;
  /** Abandon the animation, keeping the DOM change. */
  skipTransition(): void;
}

export interface ViewTransitionOptions {
  /**
   * Skip the animation when the user asked for reduced motion (default true).
   *
   * A view transition is decoration: the DOM change happens either way. Left
   * on, this is the whole of the accessibility story for it.
   */
  respectReducedMotion?: boolean;
  /**
   * Named transition types, matched in CSS by
   * `:active-view-transition-type(name)`. Ignored where unsupported.
   */
  types?: string[];
}

/** True when the browser can run view transitions. */
export const supportsViewTransitions = (): boolean =>
  typeof document !== "undefined" &&
  typeof (document as { startViewTransition?: unknown }).startViewTransition === "function";

/** Whether the user has asked for reduced motion. */
function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false;
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * The transition currently running, if any.
 *
 * Only one can be live at a time; the browser aborts the first if a second
 * starts, and the abort is what surfaces as InvalidStateError.
 */
let activeTransition: ViewTransitionHandle | null = null;

/**
 * How long a transition may run before it is force-skipped.
 *
 * Generous against the animations themselves (a few hundred ms), because this
 * is a safety net and not a scheduler. It exists so a transition that never
 * settles cannot leave the page permanently covered.
 */
const WATCHDOG_MS = 3000;

/** A handle for the paths where no real transition runs. */
function immediate(): ViewTransitionHandle {
  const done = Promise.resolve();
  return { finished: done, updateCallbackDone: done, skipTransition() {} };
}

/**
 * Run `mutate` inside a view transition, falling back to calling it directly.
 *
 * The fallback is not an edge case -- Firefox and older Safari have no view
 * transitions, and neither does any test DOM. `mutate` runs exactly once
 * either way, synchronously when there is no transition to wait for, which is
 * what keeps callers from needing two code paths.
 */
export function startViewTransition(
  mutate: () => void,
  opts: ViewTransitionOptions = {},
): ViewTransitionHandle {
  const skip =
    !supportsViewTransitions() ||
    // A document that is not visible cannot be snapshotted, and asking throws
    // InvalidStateError. There is also nothing to animate for.
    (typeof document !== "undefined" && document.visibilityState === "hidden") ||
    ((opts.respectReducedMotion ?? true) && prefersReducedMotion());

  if (skip) {
    mutate();
    return immediate();
  }

  const start = (document as unknown as {
    startViewTransition: (arg: unknown) => ViewTransitionHandle;
  }).startViewTransition;

  // Starting a transition while one is still running is the main source of
  // "InvalidStateError: Transition was aborted because of invalid state" --
  // click two nav links quickly and the second lands mid-capture. Skipping
  // the outgoing one first makes the overlap explicit instead of leaving the
  // browser to abort whichever it likes.
  if (activeTransition) {
    try { activeTransition.skipTransition(); } catch { /* already finished */ }
    activeTransition = null;
  }

  try {
    // The object form carries `types`; browsers that predate it throw on a
    // non-function argument, so fall back to the callback form.
    const handle = opts.types?.length
      ? start.call(document, { update: mutate, types: opts.types })
      : start.call(document, mutate);

    activeTransition = handle;
    watch(handle);
    return handle;
  } catch {
    // Threw before the callback ran, so the DOM change has not happened yet.
    mutate();
    return immediate();
  }
}

/**
 * Absorb the promises, and make sure a wedged transition cannot hold the page.
 *
 * A ViewTransition exposes three promises -- `ready`, `finished` and
 * `updateCallbackDone` -- and *all three* reject when a transition is skipped
 * or aborted. Catching only one of them leaves the others as unhandled
 * rejections in the console, which is what a skipped transition normally
 * produces: an AbortError nobody can act on, because the DOM change already
 * happened.
 *
 * The watchdog is the more important half. While a transition is live the
 * document is painted from snapshots and its pseudo-element tree sits above
 * everything; if the transition never settles, that overlay stays and eats
 * every click. The page is not hung -- it is covered. A dropped animation is
 * a far better outcome than a UI that has to be reloaded, so anything still
 * running well past its animation gets skipped.
 */
function watch(handle: ViewTransitionHandle): void {
  const clear = () => {
    if (activeTransition === handle) activeTransition = null;
  };

  // Expected on any skip or abort. Not errors.
  void handle.ready?.catch?.(() => {});
  void handle.finished?.catch?.(() => {}).then?.(clear, clear);

  // This one is different: it rejects when the mutation itself threw, which is
  // a real bug in the caller's code and would otherwise vanish.
  void handle.updateCallbackDone?.catch?.((e: unknown) => {
    console.error("[loom] a view transition's DOM update threw", e);
  });

  const timer = setTimeout(() => {
    if (activeTransition !== handle) return;
    try { handle.skipTransition(); } catch { /* already done */ }
    clear();
  }, WATCHDOG_MS);

  void handle.finished?.catch?.(() => {}).then?.(
    () => clearTimeout(timer),
    () => clearTimeout(timer),
  );
}

// ── Component integration ----------------------------------------------------

const OPTS = localSymbol<ViewTransitionOptions>("viewTransition");

/**
 * Wrap this component's full renders in a view transition.
 *
 * ```ts
 * @component("my-list")
 * @viewTransition
 * class MyList extends LoomElement {}
 *
 * @component("my-page")
 * @viewTransition({ types: ["slide"] })
 * class MyPage extends LoomElement {}
 * ```
 *
 * Only full renders. Loom's fast-patch path writes a text node or an
 * attribute in place, which is not the structural change view transitions
 * exist to animate, and snapshotting the page to cross-fade a counter would
 * cost far more than it shows.
 *
 * Give the elements you want animated individually a
 * `view-transition-name`, which must be unique in the document while the
 * transition runs -- see {@link transitionName}.
 */
export function viewTransition(...args: unknown[]): any {
  // Dual form: bare `@viewTransition` receives the constructor; the called
  // form receives options and returns the decorator.
  const applyTo = (ctor: Function, opts: ViewTransitionOptions) => {
    OPTS.set(ctor.prototype as object, opts);
    (ctor.prototype as { __renderWrapper?: (commit: () => void) => void }).__renderWrapper =
      function (this: object, commit: () => void) {
        startViewTransition(commit, OPTS.from(this) ?? {});
      };
  };

  if (typeof args[0] === "function") {
    applyTo(args[0] as Function, {});
    return args[0];
  }
  const opts = (args[0] ?? {}) as ViewTransitionOptions;
  return (ctor: Function) => {
    applyTo(ctor, opts);
    return ctor;
  };
}

/**
 * Give an element a `view-transition-name`.
 *
 * The name has to be unique across the document for the duration of the
 * transition; two elements sharing one makes the browser skip the transition
 * entirely rather than report an error, which is a difficult thing to notice.
 * Deriving it from a stable per-item key is the reliable way to get that
 * right, and is what makes an item animate from its old position to its new
 * one across a reorder.
 *
 * ```tsx
 * {items.map((item) => (
 *   <li style={`view-transition-name: item-${item.id}`}>{item.label}</li>
 * ))}
 * ```
 *
 * This helper is for the imperative case; in JSX, set the style directly.
 */
export function transitionName(el: HTMLElement, name: string | null): void {
  if (name === null) el.style.removeProperty("view-transition-name");
  else el.style.setProperty("view-transition-name", name);
}
