/**
 * <doc-search> — ⌘K Command Palette
 *
 * Glassmorphism modal with fuzzy search, keyboard nav, and instant navigation.
 * Reads from the @searchable registry populated by lazy.ts.
 */

import { LoomElement, component, reactive, css, mount, styles, animationFrame, query, app } from "@toyz/loom";
import { t } from "../tokens";
import { hotkey, hotkeyLabel } from "@toyz/loom/element";
import { LoomRouter } from "@toyz/loom/router";
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
    color: ${t.textPrimary};
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
    background: ${t.bgSurface};
    border: 1px solid ${t.borderSubtle};
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
    border-bottom: 1px solid ${t.borderSubtle};
  }
  .search-icon {
    flex-shrink: 0;
    color: ${t.textMuted};
  }
  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: ${t.textPrimary};
    font-size: 0.95rem;
    font-family: inherit;
    caret-color: ${t.accent};
  }
  .search-input::placeholder {
    color: ${t.textMuted};
  }
  .esc-hint {
    font-size: 0.625rem;
    font-family: ${t.fontMono};
    color: ${t.textMuted};
    border: 1px solid ${t.borderSubtle};
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
    color: ${t.textMuted};
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
    background: ${t.bgHover};
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
    color: ${t.textPrimary};
    font-weight: 500;
  }
  .result-summary {
    font-size: 0.7rem;
    color: ${t.textMuted};
    line-height: 1.4;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .result-section {
    margin-left: auto;
    font-size: 0.7rem;
    color: ${t.textMuted};
    white-space: nowrap;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .no-results {
    text-align: center;
    padding: 32px 16px;
    color: ${t.textMuted};
    font-size: 0.85rem;
  }

  /* ── Footer ── */
  .footer {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 18px;
    border-top: 1px solid ${t.borderSubtle};
    font-size: 0.625rem;
    color: ${t.textMuted};
  }
  .footer kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border: 1px solid ${t.borderSubtle};
    border-radius: 4px;
    font-family: ${t.fontMono};
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

  // "mod" is Cmd on Mac and Ctrl everywhere else, so the binding and the
  // hint printed in the sidebar come from one declaration.
  @hotkey("mod+k", { global: true })
  openViaHotkey() {
    this.open();
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
    app.get(LoomRouter).navigate(entry.to);
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

/**
 * The shortcut this palette listens for, printed for the current platform.
 * Read off the decorated method so the sidebar hint cannot drift from the
 * binding — it used to be a hardcoded "⌘K", which was wrong on Windows.
 */
export const SEARCH_HOTKEY = hotkeyLabel(DocSearch.prototype.openViaHotkey);
