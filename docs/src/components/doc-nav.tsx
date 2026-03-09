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
import { ICON_COLORS } from "../data/icon-colors";
import { navLink } from "../styles/doc-page";

const styles = css`
  :host {
    display: block;
    margin-top: 4rem;
    padding-top: 2rem;
    border-top: 1px solid var(--border-subtle, #1e1e2a);
  }

  .nav-bar {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border: 1px solid var(--border-subtle, #1e1e2a);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.015);
    text-decoration: none;
    min-width: 0;
    flex: 1;
    cursor: pointer;
    transition: all 0.22s ease;
    position: relative;
    overflow: hidden;
  }
  .nav-link::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(129, 140, 248, 0.04), rgba(244, 114, 182, 0.02));
    opacity: 0;
    transition: opacity 0.22s ease;
    pointer-events: none;
  }
  .nav-link:hover {
    border-color: rgba(129, 140, 248, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(129, 140, 248, 0.1);
  }
  .nav-link:hover::before {
    opacity: 1;
  }
  .nav-link:active {
    transform: translateY(0);
    box-shadow: none;
  }

  .nav-link.next { justify-content: flex-end; }
  .nav-link.prev { }

  .nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    flex-shrink: 0;
    transition: all 0.22s ease;
  }
  .nav-link:hover .nav-icon {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .nav-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }
  .nav-link.next .nav-text { text-align: right; align-items: flex-end; }

  .nav-direction {
    font-size: 0.5625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted, #5e5e74);
    transition: color 0.22s ease;
  }
  .nav-link:hover .nav-direction {
    color: var(--text-secondary, #9898ad);
  }

  .nav-title {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-primary, #e0e0f0);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.22s ease;
  }
  .nav-link:hover .nav-title {
    color: #fff;
  }

  .nav-section {
    font-size: 0.5625rem;
    color: var(--text-muted, #5e5e74);
    opacity: 0.7;
  }

  .nav-arrow {
    font-size: 1rem;
    color: var(--text-muted, #5e5e74);
    flex-shrink: 0;
    transition: all 0.22s ease;
    opacity: 0.5;
  }
  .nav-link:hover .nav-arrow {
    color: var(--accent, #818cf8);
    opacity: 1;
  }
  .nav-link.prev:hover .nav-arrow { transform: translateX(-3px); }
  .nav-link.next:hover .nav-arrow { transform: translateX(3px); }

  @media (max-width: 768px) {
    .nav-bar {
      flex-direction: column;
    }
    .nav-link {
      max-width: 100%;
    }
    .nav-link.next { flex-direction: row-reverse; }
    .nav-link.next .nav-text { text-align: right; }
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

  private getIconColor(entry: NavEntry): string {
    const idx = navOrder.indexOf(entry);
    return idx >= 0 ? ICON_COLORS[idx % ICON_COLORS.length] : "var(--accent, #818cf8)";
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
          <loom-link to={prev.to} styles={[navLink]} class="nav-link prev">
            <span class="nav-arrow">←</span>
            <div class="nav-icon">
              <loom-icon name={prev.icon} size="14" color={this.getIconColor(prev)}></loom-icon>
            </div>
            <div class="nav-text">
              <span class="nav-direction">Previous</span>
              <span class="nav-title">{prev.label}</span>
              <span class="nav-section">{prev.section}</span>
            </div>
          </loom-link>
        ) : <div></div>}
        {next ? (
          <loom-link to={next.to} styles={[navLink]} class="nav-link next">
            <div class="nav-text">
              <span class="nav-direction">Next</span>
              <span class="nav-title">{next.label}</span>
              <span class="nav-section">{next.section}</span>
            </div>
            <div class="nav-icon">
              <loom-icon name={next.icon} size="14" color={this.getIconColor(next)}></loom-icon>
            </div>
            <span class="nav-arrow">→</span>
          </loom-link>
        ) : <div></div>}
      </div>
    );
  }
}
