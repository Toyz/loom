/**
 * Kanban Board — Drag & drop task management with persistence.
 *
 * Demonstrates: @component, @store, @computed, @query, @watch, @styles,
 *               @dynamicCss, @draggable (selector), @dropzone (selector),
 *               @hotkey, css, loom-icon, $reset
 */
import {
  LoomElement, component, computed, query, css, styles, store,
  watch, dynamicCss, type LoomHtmlQuery,
} from "@toyz/loom";
import { draggable, dropzone, hotkey } from "@toyz/loom/element";
import { LocalAdapter } from "@toyz/loom/store";

// ── Data model ──

interface Card { id: number; text: string; column: ColumnId; }
type ColumnId = "todo" | "progress" | "done";

const COLUMNS: { id: ColumnId; label: string; icon: string; color: string }[] = [
  { id: "todo",     label: "To Do",       icon: "circle",       color: "#a78bfa" },
  { id: "progress", label: "In Progress", icon: "loader",       color: "#f59e0b" },
  { id: "done",     label: "Done",        icon: "check-circle", color: "#10b981" },
];

interface KanbanData {
  cards: Card[];
  nextId: number;
}

const local = new LocalAdapter();

// ── Static styles ──

const sheet = css`
  :host { display: block; }

  .board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    min-height: 300px;
  }

  .column {
    background: var(--surface-2, #1e1e2e);
    border: 1px solid var(--border, #333);
    border-radius: 12px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .column.drag-over {
    border-color: var(--accent, #a78bfa);
    box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.12);
  }

  .col-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.25rem;
    margin-bottom: 0.75rem;
    font-weight: 600;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted, #888);
  }

  .col-header .count {
    margin-left: auto;
    background: rgba(255,255,255,0.06);
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .cards {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-height: 60px;
  }

  .card {
    background: var(--surface, #16161e);
    border: 1px solid var(--border, #333);
    border-radius: 8px;
    padding: 0.6rem 0.75rem;
    cursor: grab;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: border-color 0.15s, transform 0.1s, opacity 0.15s;
    font-size: 0.9rem;
  }

  .card:hover {
    border-color: var(--accent, #a78bfa);
  }

  .card.dragging {
    opacity: 0.4;
    transform: scale(0.97);
  }

  .card .text {
    flex: 1;
    cursor: grab;
  }

  .card .del {
    opacity: 0;
    width: 24px; height: 24px;
    border: none; border-radius: 6px;
    cursor: pointer; background: transparent;
    color: var(--text-muted, #888);
    display: grid; place-items: center;
    transition: opacity 0.15s, color 0.15s, background 0.15s;
  }

  .card:hover .del { opacity: 1; }
  .del:hover {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
  }

  /* ── Add card ── */
  .add-row {
    display: flex; gap: 0.35rem; margin-top: 0.5rem;
  }

  .add-row input {
    flex: 1; padding: 0.45rem 0.65rem;
    border: 1px solid var(--border, #333); border-radius: 6px;
    background: var(--surface, #16161e); color: var(--text, #e0e0e0);
    font-size: 0.8rem; outline: none;
    transition: border-color 0.2s;
  }

  .add-row input::placeholder { color: var(--text-muted, #555); }
  .add-row input:focus {
    border-color: var(--accent, #a78bfa);
  }

  .add-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 30px; height: 30px;
    border: none; border-radius: 6px;
    background: var(--accent, #a78bfa); color: #fff;
    cursor: pointer; transition: opacity 0.15s;
  }
  .add-btn:hover { opacity: 0.85; }

  /* ── Empty state ── */
  .empty {
    text-align: center; padding: 1.5rem 0.5rem;
    color: var(--text-muted, #555);
    font-size: 0.8rem; font-style: italic;
    opacity: 0.6;
  }

  /* ── Footer ── */
  .footer {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 1rem; padding-top: 0.75rem;
    border-top: 1px solid var(--border, #333);
  }
  .footer-text {
    color: var(--text-muted, #888); font-size: 0.8rem;
  }
  .reset-btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.3rem 0.7rem; border: none; border-radius: 6px;
    background: transparent; color: var(--text-muted, #888);
    font-size: 0.8rem; cursor: pointer;
    transition: color 0.15s, background 0.15s;
  }
  .reset-btn:hover {
    color: #ef4444; background: rgba(239, 68, 68, 0.08);
  }
`;

@component("kanban-board")
@styles(sheet)
export class KanbanBoard extends LoomElement {
  @store<KanbanData>({ cards: [], nextId: 0 }, {
    key: "loom-example-kanban",
    storage: local,
  })
  accessor data!: KanbanData;

  @query(".add-input-todo") accessor inputTodo!: HTMLInputElement;

  // ── Computed ──

  @computed get todoCards()     { return this.data.cards.filter(c => c.column === "todo"); }
  @computed get progressCards() { return this.data.cards.filter(c => c.column === "progress"); }
  @computed get doneCards()     { return this.data.cards.filter(c => c.column === "done"); }

  cardsFor(col: ColumnId): Card[] {
    if (col === "todo") return this.todoCards;
    if (col === "progress") return this.progressCards;
    return this.doneCards;
  }

  // ── Dynamic styles ──

  @dynamicCss
  columnAccents() {
    return COLUMNS.map(c => `
      .column[data-col="${c.id}"] .col-header { color: ${c.color}; }
      .column[data-col="${c.id}"].drag-over { border-color: ${c.color}; box-shadow: 0 0 0 3px ${c.color}22; }
    `).join("\n");
  }

  // ── DnD (selector-based) ──

  @draggable({ type: "application/x-kanban", selector: ".card" })
  getDragData(el: HTMLElement) {
    return el.dataset.id;
  }

  @dropzone({ accept: "application/x-kanban", selector: ".column" })
  onCardDrop(data: string, _e: DragEvent, target: HTMLElement) {
    const cardId = Number(data);
    const newCol = target.dataset.col as ColumnId;
    const card = this.data.cards.find(c => c.id === cardId);
    if (card && newCol) card.column = newCol;
  }

  // ── Watch ──

  @watch("data")
  onDataChange(current: KanbanData, prev: KanbanData) {
    const delta = current.cards.length - (prev?.cards?.length ?? 0);
    if (delta > 0) console.log(`[kanban] +${delta} card(s)`);
    else if (delta < 0) console.log(`[kanban] ${delta} card(s)`);
  }

  // ── Dynamic query ──

  @query(".add-input-$0")
  accessor inputFor!: LoomHtmlQuery<[string], HTMLInputElement>;

  // ── Actions ──

  addCard(column: ColumnId) {
    const input = this.inputFor(column);
    const text = input?.value.trim();
    if (!text) return;
    this.data.cards.push({ id: this.data.nextId++, text, column });
    input!.value = "";
    input!.focus();
  }

  deleteCard(id: number) {
    const idx = this.data.cards.findIndex(c => c.id === id);
    if (idx !== -1) this.data.cards.splice(idx, 1);
  }

  resetAll() {
    (this as any).$reset_data();
  }

  // ── Hotkeys ──

  @hotkey("n")
  focusFirstInput() {
    this.inputTodo?.focus();
  }

  // ── Render ──

  update() {
    const total = this.data.cards.length;
    return (
      <div>
        <div class="board">
          {COLUMNS.map(col => {
            const cards = this.cardsFor(col.id);
            return (
              <div class="column" data-col={col.id}>
                <div class="col-header">
                  <loom-icon name={col.icon} size={14} color={col.color}></loom-icon>
                  {col.label}
                  <span class="count">{cards.length}</span>
                </div>
                <div class="cards">
                  {cards.length === 0
                    ? <div class="empty">No cards</div>
                    : cards.map(card => (
                        <div class="card" data-id={String(card.id)}>
                          <span class="text">{card.text}</span>
                          <button class="del" onClick={() => this.deleteCard(card.id)} title="Delete">
                            <loom-icon name="x" size={12}></loom-icon>
                          </button>
                        </div>
                      ))
                  }
                </div>
                <div class="add-row">
                  <input class={`add-input-${col.id}`} type="text" placeholder="Add card..."
                    onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && this.addCard(col.id)} />
                  <button class="add-btn" onClick={() => this.addCard(col.id)} title="Add card">
                    <loom-icon name="plus" size={12} color="#fff"></loom-icon>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {total > 0 && (
          <div class="footer">
            <span class="footer-text">{total} card{total !== 1 ? "s" : ""} total</span>
            <button class="reset-btn" onClick={() => this.resetAll()} title="Reset board">
              <loom-icon name="rotate-ccw" size={12}></loom-icon>
              Reset
            </button>
          </div>
        )}
      </div>
    );
  }
}
