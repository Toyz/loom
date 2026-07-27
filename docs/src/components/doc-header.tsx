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
import { LoomElement, component, prop, reactive, css, styles as applyStyles, mount, observer, on } from "@toyz/loom";
import { t } from "../tokens";
import { PageSections, ActiveSection, type PageSection } from "../events";
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
    font-family: ${t.fontDisplay};
    font-size: 2.75rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.05;
    text-transform: uppercase;
    margin: 0 0 0.5rem 0;
    color: ${t.textPrimary};
  }

  .subtitle {
    color: ${t.textSecondary};
    font-size: 1.0625rem;
    line-height: 1.55;
    margin: 0;
    font-weight: 400;
  }

  /* Was a 60px gradient dash. Now the first weft line of the page: a full
     rule that actually separates the header from the body. */
  .accent-line {
    margin-top: 1.5rem;
    width: 100%;
    height: 1px;
    border-radius: 0;
    background: ${t.warp};
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
  .toc-toggle:hover .toc-title { color: ${t.textSecondary}; }

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
    color: ${t.textMuted};
    margin: 0;
  }

  .toc-count {
    font-size: 0.6rem;
    font-weight: 600;
    color: ${t.textMuted};
    background: rgba(255, 255, 255, 0.04);
    padding: 1px 6px;
    border-radius: 8px;
    opacity: 0.7;
  }

  .toc-chevron {
    font-size: 0.7rem;
    color: ${t.textMuted};
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
    font-family: ${t.fontMono};
    font-size: 0.75rem;
    font-weight: 400;
    color: ${t.textMuted};
    text-decoration: none;
    cursor: pointer;
    border-left: none;
    border-bottom: 1px solid transparent;
    transition: color 0.15s ease, border-color 0.15s ease;
    white-space: nowrap;
  }
  .toc-item a:hover {
    background: transparent;
    color: ${t.textPrimary};
    border-bottom-color: ${t.thread};
  }
  .toc-item a loom-icon { display: none; }
  .toc-item a:hover loom-icon {
    opacity: 1;
    filter: brightness(1.25);
  }

  /* <doc-rail> takes over above this width; two copies of the same index
     on one screen is noise. */
  @media (min-width: 1400px) {
    .toc { display: none; }
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
  private _sections: PageSection[] = [];
  private _activeId = "";
  private _raf = 0;
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

    // Headings come from two places now. <doc-section> renders its h2 inside
    // its own shadow root, so a ".group-header h2" query cannot see it — its
    // title is read off the heading attribute instead, and the host element
    // is the scroll anchor. Pages that still write a raw <section> with a
    // .group-header keep working through the second selector.
    const nodes = root.querySelectorAll("doc-section[heading], .group-header");
    const entries: TocEntry[] = [];
    const sections: PageSection[] = [];

    nodes.forEach((node) => {
      const isSection = node.tagName === "DOC-SECTION";
      const text = (isSection
        ? node.getAttribute("heading")
        : node.querySelector("h2")?.textContent
      )?.trim() || "";
      if (!text) return;

      const id = `section-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
      node.id = id;

      const iconEl = node.querySelector("loom-icon") as HTMLElement | null;
      const icon = iconEl?.getAttribute("name") || "";
      const iconColor = iconEl?.getAttribute("color") || "var(--text-muted)";

      entries.push({ id, label: text, icon, iconColor });
      sections.push({ id, label: text, el: node as HTMLElement, level: 1 });

      // Headings inside the section become child entries, in document order.
      // A <doc-section> slots its children, so they are in this root's light
      // DOM and findable from here.
      for (const sub of Array.from(node.querySelectorAll("h3"))) {
        const subText = sub.textContent?.trim();
        if (!subText) continue;
        if (!sub.id) {
          sub.id = `${id}--${subText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
        }
        sections.push({ id: sub.id, label: subText, el: sub as HTMLElement, level: 2 });
      }
    });

    this.tocEntries = entries;
    this._sections = sections;
    // The rail cannot see into this shadow root, so it is told rather than
    // left to go looking. Sending the nodes means it never has to resolve an
    // id across a boundary.
    this.emit(new PageSections(sections));
    this.pickActive();
  }

  /**
   * Decide which section the reader is in and broadcast it.
   *
   * Not simply "the last heading above the reading line": on a short page the
   * final sections can never cross that line, because there is nothing below
   * them left to scroll, so clicking the last entry highlighted the wrong
   * one. Once the page is at the bottom, the answer is the last section
   * actually on screen.
   */
  private pickActive() {
    const secs = this._sections;
    if (!secs.length) return;

    const line = 150;
    const doc = document.documentElement;
    const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 4;

    let id = secs[0]!.id;
    if (atBottom) {
      for (const s of secs) {
        if (s.el.getBoundingClientRect().top < window.innerHeight) id = s.id;
      }
    } else {
      for (const s of secs) {
        if (s.el.getBoundingClientRect().top <= line) id = s.id;
        else break;
      }
    }

    if (id === this._activeId) return;
    this._activeId = id;
    this.emit(new ActiveSection(id));
  }

  @on(window, "scroll")
  onScroll() {
    // One read per frame; the handler only measures a handful of rects.
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this.pickActive();
    });
  }

  @on(window, "resize")
  onResize() {
    this.pickActive();
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
