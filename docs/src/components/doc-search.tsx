/**
 * <doc-search> — ⌘K Command Palette
 *
 * Glassmorphism modal with fuzzy search, keyboard nav, and instant navigation.
 * Reads from the @searchable registry populated by lazy.ts.
 */

import { LoomElement, component, reactive, css, mount, styles, animationFrame, query } from "@toyz/loom";
import { getSearchEntries, type SearchEntry } from "../search-registry";

const style = css`
  /* ── Backdrop ── */
  :host {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9999;
    align-items: flex-start;
    justify-content: center;
    padding-top: min(20vh, 160px);
  }
  :host(.open) {
    display: flex;
    color: var(--text-primary, #e8e8f0);
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    animation: fadeIn 0.15s ease;
  }

  /* ── Modal Card ── */
  .modal {
    position: relative;
    width: min(560px, calc(100vw - 32px));
    max-height: min(480px, 70vh);
    background: var(--bg-surface, #16161e);
    border: 1px solid var(--border-subtle, #2a2a3a);
    border-radius: 16px;
    box-shadow:
      0 25px 60px rgba(0, 0, 0, 0.5),
      0 0 0 1px rgba(255, 255, 255, 0.04) inset;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.96) translateY(-8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  /* ── Search Input ── */
  .search-input-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 18px;
    border-bottom: 1px solid var(--border-subtle, #1e1e2a);
  }
  .search-icon {
    flex-shrink: 0;
    color: var(--text-muted, #5e5e74);
  }
  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--text-primary, #e8e8f0);
    font-size: 0.95rem;
    font-family: inherit;
    caret-color: var(--accent, #818cf8);
  }
  .search-input::placeholder {
    color: var(--text-muted, #5e5e74);
  }
  .esc-hint {
    font-size: 0.625rem;
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    color: var(--text-muted, #5e5e74);
    border: 1px solid var(--border-subtle, #1e1e2a);
    padding: 2px 6px;
    border-radius: 4px;
    white-space: nowrap;
  }

  /* ── Results ── */
  .results {
    overflow-y: auto;
    flex: 1;
    padding: 6px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.06) transparent;
  }
  .section-label {
    font-size: 0.5625rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted, #5e5e74);
    padding: 8px 12px 4px;
    opacity: 0.7;
  }
  .result-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.1s ease;
  }
  .result-item:hover,
  .result-item.active {
    background: var(--bg-hover, #22222e);
  }
  .result-item.active {
    background: rgba(129, 140, 248, 0.12);
  }
  .result-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    opacity: 0.5;
    margin-top: 2px;
  }
  .result-info {
    flex: 1;
    min-width: 0;
  }
  .result-title {
    font-size: 0.85rem;
    color: var(--text-primary, #e8e8f0);
    font-weight: 500;
  }
  .result-summary {
    font-size: 0.7rem;
    color: var(--text-muted, #5e5e74);
    line-height: 1.4;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .result-section {
    margin-left: auto;
    font-size: 0.7rem;
    color: var(--text-muted, #5e5e74);
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .no-results {
    text-align: center;
    padding: 32px 16px;
    color: var(--text-muted, #5e5e74);
    font-size: 0.85rem;
  }

  /* ── Footer ── */
  .footer {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 18px;
    border-top: 1px solid var(--border-subtle, #1e1e2a);
    font-size: 0.625rem;
    color: var(--text-muted, #5e5e74);
  }
  .footer kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border: 1px solid var(--border-subtle, #1e1e2a);
    border-radius: 4px;
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    font-size: 0.5625rem;
    line-height: 1;
    background: rgba(255, 255, 255, 0.03);
  }
  .footer-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
`;

@component("doc-search")
@styles(style)
export class DocSearch extends LoomElement {
  @reactive accessor isOpen = false;
  @reactive accessor searchQuery = "";
  @reactive accessor activeIndex = 0;

  @query(".search-input") accessor inputEl!: HTMLInputElement;

  private filteredResults: SearchEntry[] = [];
  private needsFocus = false;

  @mount
  setup() {

    // Global ⌘K / Ctrl+K listener
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        this.open();
      }
    });
  }

  @animationFrame
  focusTick() {
    if (!this.needsFocus) return;
    if (this.inputEl) {
      this.inputEl.focus();
      this.needsFocus = false;
    }
  }

  open() {
    this.isOpen = true;
    this.searchQuery = "";
    this.activeIndex = 0;
    this.classList.add("open");
    this.needsFocus = true;
    this.scheduleUpdate();
  }

  close() {
    this.isOpen = false;
    this.classList.remove("open");
    this.scheduleUpdate();
  }

  onInput(e: Event) {
    this.searchQuery = (e.target as HTMLInputElement).value;
    this.activeIndex = 0;
    this.scheduleUpdate();
  }

  onKeyDown(e: KeyboardEvent) {
    const len = this.filteredResults.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.activeIndex = (this.activeIndex + 1) % Math.max(len, 1);
      this.scrollActiveIntoView();
      this.scheduleUpdate();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.activeIndex = (this.activeIndex - 1 + Math.max(len, 1)) % Math.max(len, 1);
      this.scrollActiveIntoView();
      this.scheduleUpdate();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (this.filteredResults[this.activeIndex]) {
        this.navigate(this.filteredResults[this.activeIndex]);
      }
    } else if (e.key === "Escape") {
      this.close();
    }
  }

  scrollActiveIntoView() {
    requestAnimationFrame(() => {
      const active = this.shadow.querySelector(".result-item.active");
      active?.scrollIntoView({ block: "nearest" });
    });
  }

  navigate(entry: SearchEntry) {
    this.close();
    location.hash = "#" + entry.to;
  }

  getFiltered(): SearchEntry[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return getSearchEntries();

    return getSearchEntries().filter(entry => {
      const haystack = [
        entry.title,
        entry.section,
        ...entry.keywords,
      ].join(" ").toLowerCase();
      // All tokens must match
      return q.split(/\s+/).every(tok => haystack.includes(tok));
    });
  }

  update() {
    if (!this.isOpen) return <div></div>;

    this.filteredResults = this.getFiltered();

    // Group by section
    const groups = new Map<string, SearchEntry[]>();
    for (const r of this.filteredResults) {
      if (!groups.has(r.section)) groups.set(r.section, []);
      groups.get(r.section)!.push(r);
    }

    let globalIdx = 0;

    return (
      <div>
        <div class="backdrop" onClick={() => this.close()}></div>
        <div class="modal">
          <div class="search-input-wrap">
            <loom-icon class="search-icon" name="search" size={18}></loom-icon>
            <input
              class="search-input"
              type="text"
              placeholder="Search docs..."
              value={this.searchQuery}
              onInput={(e: Event) => this.onInput(e)}
              onKeyDown={(e: KeyboardEvent) => this.onKeyDown(e)}
              autofocus
            />
            <span class="esc-hint">ESC</span>
          </div>

          <div class="results">
            {this.filteredResults.length === 0 ? (
              <div class="no-results">No results found</div>
            ) : (
              [...groups.entries()].map(([section, items]) => {
                const sectionItems = items.map(item => {
                  const idx = globalIdx++;
                  return (
                    <div
                      class={`result-item ${idx === this.activeIndex ? "active" : ""}`}
                      onClick={() => this.navigate(item)}
                      onMouseEnter={() => { this.activeIndex = idx; this.scheduleUpdate(); }}
                    >
                      <loom-icon class="result-icon" name={item.icon} size={16}></loom-icon>
                      <div class="result-info">
                        <div class="result-title">{item.title}</div>
                        {item.summary ? <div class="result-summary">{item.summary}</div> : null}
                      </div>
                      <span class="result-section">{item.section}</span>
                    </div>
                  );
                });
                return [
                  <div class="section-label">{section}</div>,
                  ...sectionItems,
                ];
              })
            )}
          </div>

          <div class="footer">
            <span class="footer-item"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
            <span class="footer-item"><kbd>↵</kbd> open</span>
            <span class="footer-item"><kbd>esc</kbd> close</span>
          </div>
        </div>
      </div>
    );
  }
}
