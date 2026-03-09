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

  /* ── Title with shimmer ── */

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .title-row loom-icon {
    flex-shrink: 0;
    opacity: 0.85;
  }

  h1 {
    font-size: 2.5rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    line-height: 1.15;
    margin: 0 0 0.25rem 0;
    background: linear-gradient(
      90deg,
      #e8e8f0 0%,
      #e8e8f0 35%,
      var(--accent, #818cf8) 50%,
      var(--rose, #f472b6) 60%,
      #e8e8f0 75%,
      #e8e8f0 100%
    );
    background-size: 300% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 8s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%, 100% { background-position: 100% 50%; }
    50%      { background-position: 0% 50%; }
  }

  .subtitle {
    color: var(--text-secondary, #9898ad);
    font-size: 1.125rem;
    line-height: 1.5;
    margin: 0;
    font-weight: 400;
  }

  /* ── Accent line ── */

  .accent-line {
    margin-top: 1.5rem;
    width: 60px;
    height: 3px;
    border-radius: 3px;
    background: linear-gradient(90deg, var(--accent, #818cf8), var(--rose, #f472b6));
    opacity: 0.6;
  }

  /* ── TOC ── */

  .toc {
    margin-top: 1.5rem;
    padding: 0;
    background: rgba(255, 255, 255, 0.015);
    border: 1px solid var(--border-subtle, #1e1e2a);
    border-radius: 10px;
    overflow: hidden;
  }

  .toc-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.7rem 1.25rem;
    background: none;
    border: none;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
  }
  .toc-toggle:hover {
    background: rgba(255, 255, 255, 0.02);
  }

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
    gap: 2px;
    list-style: none;
    margin: 0;
    padding: 0 1.25rem 0.75rem;
  }

  .toc-item {
    flex: 0 0 50%;
    min-width: 0;
  }

  .toc-item a {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 450;
    color: var(--text-secondary, #9898ad);
    text-decoration: none;
    cursor: pointer;
    border-left: 2px solid transparent;
    transition: all 0.18s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .toc-item a:hover {
    background: rgba(129, 140, 248, 0.06);
    border-left-color: var(--accent, #818cf8);
    color: #e0e0f0;
    padding-left: 12px;
  }
  .toc-item a:active {
    background: rgba(129, 140, 248, 0.12);
    transform: scale(0.98);
  }
  .toc-item a loom-icon {
    flex-shrink: 0;
    opacity: 0.55;
    transition: opacity 0.18s ease, filter 0.18s ease;
  }
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
