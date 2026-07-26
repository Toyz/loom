/**
 * Docs — bus events.
 *
 * The right rail needs to know what sections the current page has. The first
 * version worked that out by walking down through shadow roots from the
 * outlet, which was wrong twice over: it had to guess how many boundaries a
 * @lazy route puts in the way, and it had to guess *when* to look, because a
 * lazily-loaded page arrives whenever its module finishes downloading rather
 * than a fixed number of frames after the route changes.
 *
 * The page already knows both things, so it says so on the bus and the rail
 * listens. No traversal, no polling, no timing assumption.
 */

import { LoomEvent } from "@toyz/loom";

export interface PageSection {
  /** Stable id, also set on the element, so deep links keep working. */
  id: string;
  /** The heading text. */
  label: string;
  /**
   * The section element itself, for scrolling and scroll-spy.
   *
   * Passed by reference on purpose: the bus is in-process and both ends live
   * for the same period, so handing over the node is cheaper and far more
   * reliable than handing over an id the rail would then have to resolve back
   * across a shadow boundary it cannot see into.
   */
  el: HTMLElement;
}

/**
 * Emitted by <doc-header> once its page has rendered, and again whenever that
 * page's sections change.
 *
 * An empty list is a real answer meaning "this page has no index", so the rail
 * clears rather than keeping the previous page's entries.
 */
export class PageSections extends LoomEvent {
  constructor(public readonly sections: PageSection[]) {
    super();
  }

  /**
   * Both the initial render and the mutation observer can fire in the same
   * flush; the rail only needs the last state, so collapse them.
   */
  override get dedupeKey() {
    return `page-sections:${this.sections.map((s) => s.id).join(",")}`;
  }
}

/**
 * Which section the reader is currently in.
 *
 * The page decides this, not the rail. The page is the only side that knows
 * where its sections actually are, and keeping the decision there means the
 * rail is a pure view — it renders what it is told and owns no observers.
 *
 * The rule is not simply "the last heading above the reading line". On a
 * short page the final sections can never reach that line, because there is
 * nothing below them left to scroll, so those entries could never light up.
 * Once the page is scrolled to the bottom the answer becomes "the last
 * section actually on screen" instead.
 */
export class ActiveSection extends LoomEvent {
  constructor(public readonly id: string) {
    super();
  }

  override get dedupeKey() {
    return `active-section:${this.id}`;
  }
}
