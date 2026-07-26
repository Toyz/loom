/**
 * Doc Page Nav — Prev / Next
 *
 * Rendered at the bottom of every doc page.
 * Reads the flat page order from the nav-data module.
 * Includes page icons with matching colors for a polished feel.
 */
import { LoomElement, component, reactive, on, css, styles as applyStyles, mount } from "@toyz/loom";
import { RouteChanged } from "@toyz/loom/router";
import { navOrder, type NavEntry } from "../data/nav-order";

const styles = css`
  :host {
    display: block;
    margin-top: 4rem;
    border-top: 1px solid var(--warp-lit, #4a4839);
  }

  .nav-bar { display: block; }

  /* Layout lives on the anchor, not on the <loom-link> host. The host is not
     the link — the <a> inside its shadow is — so styling the host left the
     padding outside the hit area and only the text itself was clickable. */
  loom-link::part(anchor) {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 20px 16px;
    border-bottom: 1px solid var(--warp, #33322a);
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  loom-link::part(anchor):hover {
    background: var(--ground-raised, #1c1c15);
  }
  /* Next reads right-to-left: text first, arrow last, everything flush right. */
  loom-link.next::part(anchor) {
    flex-direction: row-reverse;
  }

  .nav-arrow {
    font-family: var(--font-mono, monospace);
    font-size: 1rem;
    line-height: 1;
    color: var(--thread, #c4472f);
    flex-shrink: 0;
    transition: transform 0.15s ease;
  }
  loom-link.prev::part(anchor):hover .nav-arrow { transform: translateX(-3px); }
  loom-link.next::part(anchor):hover .nav-arrow { transform: translateX(3px); }

  .nav-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }
  .next .nav-text { align-items: flex-end; text-align: right; }

  .nav-direction {
    font-family: var(--font-mono, monospace);
    font-size: 0.625rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--text-muted, #6d6858);
  }

  .nav-title {
    font-family: var(--font-display, sans-serif);
    font-size: 1.125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.01em;
    color: var(--text-primary, #e6e1d3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-section {
    font-family: var(--font-mono, monospace);
    font-size: 0.625rem;
    letter-spacing: 0.08em;
    color: var(--text-muted, #6d6858);
  }

  .nav-icon { display: none; }

  @media (max-width: 768px) {
    .nav-title { font-size: 1rem; white-space: normal; }
  }
`;

@component("doc-nav")
@applyStyles(styles)
export class DocNav extends LoomElement {

  @reactive accessor currentPath = "/";

  @mount
  readInitialRoute() {
    const hash = window.location.hash.replace(/^#/, "") || "/";
    this.currentPath = hash;
  }

  @on(RouteChanged)
  onRoute(e: RouteChanged) {
    this.currentPath = e.path;
  }

  update() {
    const idx = navOrder.findIndex(e => e.to === this.currentPath);
    if (idx === -1) return <div></div>;

    const prev: NavEntry | undefined = navOrder[idx - 1];
    const next: NavEntry | undefined = navOrder[idx + 1];

    if (!prev && !next) return <div></div>;

    return (
      <div class="nav-bar">
        {prev ? (
          <loom-link to={prev.to} class="prev">
            <span class="nav-arrow">←</span>
            <div class="nav-text">
              <span class="nav-direction">Previous</span>
              <span class="nav-title">{prev.label}</span>
              <span class="nav-section">{prev.section}</span>
            </div>
          </loom-link>
        ) : null}
        {next ? (
          <loom-link to={next.to} class="next">
            <div class="nav-text">
              <span class="nav-direction">Next</span>
              <span class="nav-title">{next.label}</span>
              <span class="nav-section">{next.section}</span>
            </div>
            <span class="nav-arrow">→</span>
          </loom-link>
        ) : null}
      </div>
    );
  }
}
