/**
 * Doc Header — Page title + subtitle + auto-generated TOC
 *
 * Usage:
 *   <doc-header title="Events" subtitle="Typed events and declarative decorators."></doc-header>
 *
 * Scans the host page's shadow DOM for group-header h2 elements
 * and builds a table-of-contents automatically.
 * Each TOC entry shows the section's loom-icon with its original color.
 * TOC is collapsible — starts expanded, click header to toggle.
 */
import { LoomElement, component, prop, reactive, css, styles as applyStyles, mount, observer } from "@toyz/loom";
import { navOrder } from "../data/nav-order";
import { ICON_COLORS } from "../data/icon-colors";

interface TocEntry {
  id: string;
  label: string;
  icon: string;
  iconColor: string;
}

const styles = css`
  :host {
    display: block;
    margin-bottom: 2.5rem;
  }

  /* ── Title ──
     Plex Condensed, uppercase, stamped. The previous title animated a
     gradient across itself on an 8s loop; a page title is a label, and
     movement with no meaning is the loudest AI tell in the whole design. */

  .title-row {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }
  /* The per-page icon carried no information that the title did not. */
  .title-row loom-icon { display: none; }

  h1 {
    font-family: var(--font-display, sans-serif);
    font-size: 2.75rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.05;
    text-transform: uppercase;
    margin: 0 0 0.5rem 0;
    color: var(--text-primary, #e6e1d3);
  }

  .subtitle {
    color: var(--text-secondary, #a09a88);
    font-size: 1.0625rem;
    line-height: 1.55;
    margin: 0;
    font-weight: 400;
    max-width: 62ch;
  }

  /* Was a 60px gradient dash. Now the first weft line of the page: a full
     rule that actually separates the header from the body. */
  .accent-line {
    margin-top: 1.5rem;
    width: 100%;
    height: 1px;
    border-radius: 0;
    background: var(--warp, #33322a);
    opacity: 1;
  }

  /* ── Contents ──
     Was a bordered card restating every H2 directly above those same H2s.
     Now a single quiet line of jump links, closer to a card's index strip. */

  .toc {
    margin-top: 1rem;
    padding: 0;
    background: transparent;
    border: none;
    border-radius: 0;
    overflow: visible;
  }

  .toc-toggle {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;
    width: auto;
    padding: 0.25rem 0;
    background: none;
    border: none;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
  }
  .toc-toggle:hover .toc-title { color: var(--text-secondary, #a09a88); }

  .toc-toggle-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toc-title {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted, #5e5e74);
    margin: 0;
  }

  .toc-count {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--text-muted, #5e5e74);
    background: rgba(255, 255, 255, 0.04);
    padding: 1px 6px;
    border-radius: 8px;
    opacity: 0.7;
  }

  .toc-chevron {
    font-size: 0.7rem;
    color: var(--text-muted, #5e5e74);
    transition: transform 0.25s ease;
    line-height: 1;
  }
  .toc-chevron.open {
    transform: rotate(180deg);
  }

  .toc-body {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.25s ease;
  }
  .toc-body.open {
    grid-template-rows: 1fr;
  }

  .toc-inner {
    overflow: hidden;
  }

  .toc-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1.25rem;
    list-style: none;
    margin: 0;
    padding: 0.5rem 0 0.25rem;
  }

  .toc-item {
    flex: 0 0 auto;
    min-width: 0;
  }

  .toc-item a {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0;
    border-radius: 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--text-muted, #6d6858);
    text-decoration: none;
    cursor: pointer;
    border-left: none;
    border-bottom: 1px solid transparent;
    transition: color 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
  }
  .toc-item a:hover {
    background: transparent;
    color: var(--text-primary, #e6e1d3);
    border-bottom-color: var(--thread, #c4472f);
  }
  .toc-item a loom-icon { display: none; }
  .toc-item a:hover loom-icon {
    opacity: 1;
    filter: brightness(1.25);
  }

  @media (max-width: 768px) {
    h1 { font-size: 1.75rem; }
    .subtitle { font-size: 1rem; }
    .toc-item { flex: 0 0 100%; }
  }
`;

@component("doc-header")
@applyStyles(styles)
export class DocHeader extends LoomElement {

  @prop accessor title = "";
  @prop accessor subtitle = "";
  @reactive accessor tocEntries: TocEntry[] = [];
  @reactive accessor tocOpen = true;
  @reactive accessor pageIcon = "";
  @reactive accessor iconColor = "var(--accent, #818cf8)";

  @mount
  resolveIcon() {
    const hash = window.location.hash.replace(/^#/, "") || "/";
    const idx = navOrder.findIndex(e => e.to === hash);
    if (idx >= 0) {
      this.pageIcon = navOrder[idx].icon;
      this.iconColor = ICON_COLORS[idx % ICON_COLORS.length];
    }
  }

  @mount
  initialScan() {
    requestAnimationFrame(() => this.buildToc());
  }

  @observer("mutation", { childList: true, subtree: true }, el => el.getRootNode())
  onParentMutation(_record: MutationRecord) {
    this.buildToc();
  }

  private buildToc() {
    const root = this.getRootNode() as ShadowRoot;
    if (!root) return;

    const headings = root.querySelectorAll(".group-header h2");
    const entries: TocEntry[] = [];

    headings.forEach((h2) => {
      const text = h2.textContent?.trim() || "";
      if (!text) return;

      const id = `section-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
      const header = h2.closest(".group-header");
      if (header) header.id = id;

      const iconEl = header?.querySelector("loom-icon") as HTMLElement | null;
      const icon = iconEl?.getAttribute("name") || "";
      const iconColor = iconEl?.getAttribute("color") || "var(--accent, #818cf8)";

      entries.push({ id, label: text, icon, iconColor });
    });

    this.tocEntries = entries;
  }

  scrollToSection(id: string) {
    const root = this.getRootNode() as ShadowRoot;
    const el = root?.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  toggleToc() {
    this.tocOpen = !this.tocOpen;
  }

  update() {
    return (
      <div>
        <div class="title-row">
          {this.pageIcon ? <loom-icon name={this.pageIcon} size="32" color={this.iconColor}></loom-icon> : null}
          <h1>{this.title}</h1>
        </div>
        {this.subtitle ? <p class="subtitle">{this.subtitle}</p> : null}
        <div class="accent-line"></div>
        {this.tocEntries.length > 1 ? (
          <div class="toc">
            <button class="toc-toggle" onClick={() => this.toggleToc()}>
              <div class="toc-toggle-left">
                <span class="toc-title">On this page</span>
                <span class="toc-count">{this.tocEntries.length}</span>
              </div>
              <span class={`toc-chevron ${this.tocOpen ? 'open' : ''}`}>▼</span>
            </button>
            <div class={`toc-body ${this.tocOpen ? 'open' : ''}`}>
              <div class="toc-inner">
                <ul class="toc-list">
                  {this.tocEntries.map(entry => (
                    <li class="toc-item">
                      <a href="javascript:void(0)" onClick={() => this.scrollToSection(entry.id)}>
                        {entry.icon ? <loom-icon name={entry.icon} size="14" color={entry.iconColor}></loom-icon> : null}
                        {entry.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  }
}
