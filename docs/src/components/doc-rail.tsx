/**
 * <doc-rail> — the page index, as the punched edge of a card.
 *
 * A Jacquard card is read as a column of positions down its edge, so the
 * right-hand index is that column: one position per section, punched at the
 * one you are currently inside.
 *
 * This lives in the app shell as a real flex column rather than inside
 * <doc-header> as a fixed overlay. The first attempt did the latter and
 * computed a left offset from the page geometry tokens; it drifted off the
 * true column edge and printed the track straight through the code blocks.
 * Layout does that arithmetic correctly and for free, so overlap is no
 * longer a thing that can happen.
 *
 * The rail is told what is on the page rather than going to look: pages emit
 * PageSections on the bus and this listens. See src/events.ts for why.
 */

import { LoomElement, component, reactive, css, styles, on } from "@toyz/loom";
import { PageSections, ActiveSection, type PageSection } from "../events";

const railStyles = css`
  /* Sticky belongs on the host, not on an element inside it. A sticky box
     can only travel within its containing block, and the containing block of
     anything inside :host is :host itself — which is exactly as tall as the
     rail, so there was nowhere to travel. On the host, the containing block
     is <main>, which is the full height of the page. */
  :host {
    display: block;
    width: 226px;
    flex: 0 0 226px;
    position: sticky;
    top: 64px;
    align-self: flex-start;
    max-height: calc(100vh - 120px);
  }

  .sticky {
    max-height: inherit;
    display: flex;
    flex-direction: column;
    min-height: 0;
    /* The card's edge. Positions are punched along it. */
    border-left: 1px solid var(--warp, #33322a);
    padding: 0 0 0 14px;
  }

  nav {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .head {
    font-family: var(--font-mono, monospace);
    font-size: 0.5625rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-muted, #6d6858);
    margin-bottom: 10px;
    flex: 0 0 auto;
  }

  ol {
    list-style: none;
    margin: 0;
    padding: 0 0 8px;
    flex: 0 1 auto;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--warp-lit, #4a4839) transparent;
  }

  a {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 4px 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    line-height: 1.45;
    color: var(--text-muted, #6d6858);
    text-decoration: none;
  }
  /* Sits inside the edge rule with no negative margin. <ol> is the scroll
     container and a scroll container clips on BOTH axes, so a punch hung
     outside its content box with a negative margin was being cut in half. */
  a loom-icon {
    display: flex;
    flex: 0 0 auto;
    margin-top: 2px;
    color: var(--warp-lit, #4a4839);
  }
  a:hover { color: var(--text-secondary, #a09a88); }
  a:hover loom-icon { color: var(--text-muted, #6d6858); }

  li.on a { color: var(--text-primary, #e6e1d3); }
  li.on a loom-icon { color: var(--thread, #c4472f); }

  /* A heading inside a section. Indented and set a step smaller, so the rail
     reads as an outline of the page rather than one flat list. */
  li.sub a {
    padding-left: 20px;
    font-size: 0.6875rem;
  }
  li.sub a loom-icon { transform: scale(0.82); }

  spec-card { flex: 0 0 auto; }

  a:focus-visible {
    outline: 1px solid var(--thread, #c4472f);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: no-preference) {
    a, a loom-icon { transition: color 0.15s ease; }
  }
`;

@component("doc-rail")
@styles(railStyles)
export class DocRail extends LoomElement {
  @reactive accessor entries: PageSection[] = [];
  @reactive accessor activeId = "";

  /**
   * The page says what it contains. Nothing here walks the DOM or waits a
   * guessed number of frames for a lazy route to finish loading — whenever
   * the page knows, it says so, and that is when this runs.
   */
  @on(PageSections)
  onSections(e: PageSections) {
    // One section is not an index.
    this.entries = e.sections.length > 1 ? e.sections : [];
    if (!this.entries.length) this.activeId = "";
  }

  /**
   * The page also says which section is current. Deciding that needs to know
   * where the sections are and how far the document can still scroll, which
   * is the page's business; this component is a view over the answer.
   */
  @on(ActiveSection)
  onActive(e: ActiveSection) {
    this.activeId = e.id;
  }

  update() {
    // The card is not part of the index and must not depend on it. It used to
    // live inside the <nav>, which is skipped when a page has no sections --
    // so on those pages the card never mounted and its @api never ran.
    const index = this.entries.length > 0;
    return (
      <div class="sticky">
        {index ? (
          <nav aria-label="On this page">
            <div class="head">On this page</div>
            <ol>
          {this.entries.map((e) => {
            const on = e.id === this.activeId;
            return (
              <li class={`${e.level === 2 ? "sub" : ""}${on ? " on" : ""}`.trim()}>
                <a
                  href="javascript:void(0)"
                  aria-current={on ? "true" : undefined}
                  onClick={() => e.el.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  <loom-icon name="punch" size={11} strokeWidth={1.25} fill={on ? "currentColor" : "none"}></loom-icon>
                  <span>{e.label}</span>
                </a>
              </li>
            );
          })}
            </ol>
          </nav>
        ) : null}
        <spec-card></spec-card>
      </div>
    );
  }
}
