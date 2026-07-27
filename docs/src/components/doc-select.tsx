/**
 * <doc-select> — a select that belongs to this design.
 *
 * A native `<select>` renders its option list with the platform's own widget.
 * It ignores the page's typography and colours, it cannot be styled from the
 * inside, and on a dark surface it usually arrives light. So the control looks
 * like the docs and the thing it opens looks like a screenshot from a
 * different operating system.
 *
 * Everything hard about replacing one is already in the platform, and Loom now
 * wraps it:
 *
 *  - `@popover` puts the list in the **top layer**, so it is not clipped by
 *    any ancestor's `overflow`, and the browser handles light dismiss and
 *    Escape. That is the part hand-rolled dropdowns get wrong -- the
 *    click-outside listener that leaks, or the z-index that loses.
 *  - `@aria` gives the host a `combobox` role through ElementInternals, so the
 *    semantics do not depend on the page remembering to write them.
 *  - `@state` exposes `:state(open)` for styling, without an attribute anyone
 *    could overwrite.
 *
 * What is left is the keyboard, which is the actual work in a custom select
 * and the reason most of them are worse than the native one: arrows, Home and
 * End, type-ahead, Enter and Escape.
 *
 *   <doc-select
 *     value={this.format}
 *     options={[{ value: "png", label: "PNG" }, { value: "svg", label: "SVG" }]}
 *     onSelect={(v) => (this.format = v)}
 *   ></doc-select>
 */

import {
  LoomElement, component, prop, reactive, popover, state, aria, css, styles,
} from "@toyz/loom";
import { t } from "../tokens";

export interface SelectOption {
  value: string;
  label: string;
  /** Optional second line, e.g. a hint about what the option does. */
  note?: string;
}

const selectStyles = css`
  :host {
    display: inline-block;
    position: relative;
    font-family: ${t.fontSans};
  }

  /* The trigger. Sized like the other controls in the docs: die-cut corners,
     hairline border, mono for the value so it lines up with code. */
  .trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    min-width: 7rem;
    padding: 0.4rem 0.6rem;
    border: 1px solid ${t.warpLit};
    border-radius: 2px;
    background: ${t.groundRaised};
    color: ${t.textPrimary};
    font-family: ${t.fontMono};
    font-size: 0.75rem;
    line-height: 1.4;
    cursor: pointer;
    text-align: left;
  }
  .trigger:hover { border-color: ${t.thread}; }
  .trigger:focus-visible {
    outline: 2px solid ${t.thread};
    outline-offset: 1px;
  }

  /* The caret rotates rather than swapping glyph, so the two states are
     obviously the same object. */
  .caret {
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    border-right: 1.5px solid ${t.textMuted};
    border-bottom: 1.5px solid ${t.textMuted};
    transform: translateY(-2px) rotate(45deg);
    transition: transform 120ms ${t.easeOut};
  }
  :host(:state(open)) .caret { transform: translateY(1px) rotate(-135deg); }

  /* The list lives in the top layer, so it is positioned against the viewport
     -- the coordinates are measured from the trigger on open. */
  [popover] {
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 3px;
    border: 1px solid ${t.warpLit};
    border-radius: 2px;
    background: ${t.groundRaised};
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
    overflow: auto;
    max-height: 16rem;
  }
  [popover]::backdrop { background: transparent; }

  ul { margin: 0; padding: 0; list-style: none; }

  li {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.35rem 0.55rem;
    border-radius: 2px;
    font-family: ${t.fontMono};
    font-size: 0.75rem;
    color: ${t.textSecondary};
    cursor: pointer;
    white-space: nowrap;
  }
  /* Hover and keyboard cursor are the same affordance, so they look the
     same -- a separate hover colour makes the arrow keys feel like a
     different mode. */
  li[data-active="true"] { background: ${t.groundHover}; color: ${t.textPrimary}; }

  li[aria-selected="true"] { color: ${t.textPrimary}; }
  /* A punch, not a tick: the selected row is a marked position on a card. */
  li[aria-selected="true"]::before {
    content: '';
    width: 5px;
    height: 5px;
    background: ${t.thread};
    flex: 0 0 auto;
  }
  li:not([aria-selected="true"])::before {
    content: '';
    width: 5px;
    flex: 0 0 auto;
  }

  .note {
    margin-left: auto;
    padding-left: 0.75rem;
    color: ${t.textMuted};
    font-size: 0.6875rem;
  }
`;

@component("doc-select")
@aria({ role: "combobox", ariaHasPopup: "listbox" })
@styles(selectStyles)
export class DocSelect extends LoomElement {
  /** Currently selected value. */
  @prop accessor value = "";

  /** The options to show. */
  @prop accessor options: SelectOption[] = [];

  /** Called with the newly selected value. */
  @prop accessor onSelect: ((value: string) => void) | undefined = undefined;

  /** Accessible name, when there is no visible label beside it. */
  @prop accessor label = "";

  /** Drives the listbox. Escape and a click outside write back to it. */
  @popover accessor open = false;

  /** Selectable as doc-select:state(open) — rotates the caret. */
  @state accessor isOpen = false;

  /** Keyboard cursor. Separate from `value`: moving is not choosing. */
  @reactive accessor activeIndex = 0;

  /** Viewport coordinates for the list, measured from the trigger. */
  @reactive accessor pos = { left: 0, top: 0, width: 0 };

  /** Type-ahead buffer, cleared after a pause like a native select's. */
  private typed = "";
  private typedAt = 0;

  private get selectedIndex(): number {
    const i = this.options.findIndex((o) => o.value === this.value);
    return i === -1 ? 0 : i;
  }

  private toggle(): void {
    this.open ? this.close() : this.show();
  }

  private show(): void {
    const trigger = this.shadowRoot?.querySelector<HTMLElement>(".trigger");
    if (trigger) {
      const r = trigger.getBoundingClientRect();
      // Flip above when there is not room below, the way a native list does.
      const below = window.innerHeight - r.bottom;
      const top = below < 180 && r.top > below ? r.top - Math.min(256, r.top) - 4 : r.bottom + 4;
      this.pos = { left: Math.round(r.left), top: Math.round(top), width: Math.round(r.width) };
    }
    this.activeIndex = this.selectedIndex;
    this.open = true;
    this.isOpen = true;
  }

  private close(focusTrigger = true): void {
    this.open = false;
    this.isOpen = false;
    if (focusTrigger) this.shadowRoot?.querySelector<HTMLElement>(".trigger")?.focus();
  }

  private choose(index: number): void {
    const opt = this.options[index];
    if (!opt) return;
    this.value = opt.value;
    this.onSelect?.(opt.value);
    this.close();
  }

  private move(delta: number): void {
    const n = this.options.length;
    if (!n) return;
    this.activeIndex = (this.activeIndex + delta + n) % n;
    this.scrollActiveIntoView();
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() => {
      this.shadowRoot
        ?.querySelector(`li[data-index="${this.activeIndex}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
  }

  /** Jump to the first option starting with what was typed. */
  private typeAhead(key: string): void {
    const now = Date.now();
    this.typed = now - this.typedAt > 700 ? key : this.typed + key;
    this.typedAt = now;
    const i = this.options.findIndex((o) => o.label.toLowerCase().startsWith(this.typed));
    if (i !== -1) {
      this.activeIndex = i;
      if (!this.open) this.choose(i);
      else this.scrollActiveIntoView();
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); this.open ? this.move(1) : this.show(); return;
      case "ArrowUp": e.preventDefault(); this.open ? this.move(-1) : this.show(); return;
      case "Home": if (this.open) { e.preventDefault(); this.activeIndex = 0; this.scrollActiveIntoView(); } return;
      case "End": if (this.open) { e.preventDefault(); this.activeIndex = this.options.length - 1; this.scrollActiveIntoView(); } return;
      case "Enter":
      case " ":
        e.preventDefault();
        this.open ? this.choose(this.activeIndex) : this.show();
        return;
      case "Escape":
        // The popover closes itself; this keeps focus where the user left it.
        if (this.open) { e.preventDefault(); this.close(); }
        return;
      case "Tab":
        if (this.open) this.close(false);
        return;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          this.typeAhead(e.key.toLowerCase());
        }
    }
  }

  update() {
    const options = this.options ?? [];
    const selected = options.find((o) => o.value === this.value);

    return (
      <>
        <button
          type="button"
          class="trigger"
          aria-expanded={String(this.open)}
          aria-label={this.label || undefined}
          onClick={() => this.toggle()}
          onKeyDown={(e: KeyboardEvent) => this.onKeyDown(e)}
        >
          <span>{selected?.label ?? "Select"}</span>
          <span class="caret"></span>
        </button>

        <div
          popover="auto"
          role="listbox"
          style={`left: ${this.pos.left}px; top: ${this.pos.top}px; min-width: ${this.pos.width}px`}
          onKeyDown={(e: KeyboardEvent) => this.onKeyDown(e)}
        >
          <ul>
            {options.map((o, i) => (
              <li
                role="option"
                data-index={String(i)}
                data-active={String(i === this.activeIndex)}
                aria-selected={String(o.value === this.value)}
                onClick={() => this.choose(i)}
                onMouseEnter={() => (this.activeIndex = i)}
              >
                <span>{o.label}</span>
                {o.note ? <span class="note">{o.note}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </>
    );
  }
}
