/**
 * Overlay Demo — <overlay-demo>
 *
 * @popover and @dialog, running. Both put their content in the browser's top
 * layer, so the interesting thing to show is not that a panel appears -- it is
 * that the panel escapes the component's own `overflow: hidden` box without
 * being moved anywhere, and that dismissing it natively keeps the accessor
 * honest.
 */
import { LoomElement, component, reactive, popover, dialog, css, styles } from "@toyz/loom";
import { t } from "../../../tokens";

const demoStyles = css`
  :host { display: block; }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  /* Deliberately clipping. A panel positioned inside this box would be cut
     off; one in the top layer is not, which is the whole demonstration. */
  .clip {
    position: relative;
    overflow: hidden;
    padding: 1rem;
    border: 1px dashed ${t.warpLit};
    border-radius: 2px;
  }

  button {
    padding: 0.5rem 0.9rem;
    border: 1px solid ${t.warpLit};
    border-radius: 2px;
    background: ${t.groundRaised};
    color: ${t.textPrimary};
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
  }
  button:hover { border-color: ${t.thread}; }

  /* A popover is in the top layer, so it is positioned against the viewport
     and not against anything around it. inset:auto clears the UA's
     centering, which means it must then be placed explicitly -- left at auto
     it pins to the top-left corner, which is exactly what it did. Anchor
     positioning would do this in CSS, but it is still Chrome-only, so the
     coordinates are measured from the trigger on open. */
  [popover] {
    position: fixed;
    inset: auto;
    margin: 0;
    padding: 0.5rem;
    border: 1px solid ${t.warpLit};
    border-radius: 2px;
    background: ${t.groundRaised};
    color: ${t.textPrimary};
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }
  [popover] menu {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 2px;
    min-width: 10rem;
  }
  [popover] menu button {
    width: 100%;
    text-align: left;
    border-color: transparent;
    background: none;
  }
  [popover] menu button:hover { background: ${t.groundHover}; }

  /* Centred explicitly. showModal() makes everything behind the dialog inert,
     so a dialog that opens without rendering leaves the page unusable with
     nothing on screen to dismiss -- it reads as a frozen tab. Not worth
     leaving to a UA default. */
  dialog {
    position: fixed;
    inset: 0;
    margin: auto;
    width: min(24rem, calc(100vw - 2rem));
    height: fit-content;
    padding: 1.25rem;
    border: 1px solid ${t.warpLit};
    border-radius: 2px;
    background: ${t.groundRaised};
    color: ${t.textPrimary};
  }
  dialog::backdrop { background: rgba(10, 10, 8, 0.72); }
  dialog p { margin: 0 0 1rem; }
  dialog form { display: flex; gap: 0.5rem; justify-content: flex-end; }

  .state {
    margin-top: 0.75rem;
    font-family: ${t.fontMono};
    font-size: 0.6875rem;
    color: ${t.textMuted};
  }
  .state b { color: ${t.thread}; font-weight: 600; }

  .picked {
    margin-top: 0.5rem;
    font-size: 0.8125rem;
    color: ${t.textSecondary};
  }
`;

@component("overlay-demo")
@styles(demoStyles)
export class OverlayDemo extends LoomElement {
  @popover accessor menuOpen = false;
  @dialog accessor confirmOpen = false;

  /** Viewport coordinates for the menu -- see toggleMenu. */
  @reactive accessor menuPos = { left: 0, top: 0 };

  @reactive accessor picked = "nothing yet";
  @reactive accessor result = "";

  private choose(what: string) {
    this.picked = what;
    this.menuOpen = false;
  }

  /**
   * Put the menu under its trigger, in viewport coordinates.
   *
   * Measured, because a popover is in the top layer and therefore positioned
   * against the viewport -- no CSS on an ancestor can place it.
   *
   * Held in reactive state rather than written to `pop.style` directly: the
   * position has to be part of what the template declares, or the next morph
   * removes an inline style the JSX never mentioned. Writing it imperatively
   * looked right until the re-render that opening the menu causes wiped it,
   * and the popover snapped back to the viewport corner.
   */
  private toggleMenu(e: Event) {
    const trigger = e.currentTarget as HTMLElement;
    if (!this.menuOpen) {
      const r = trigger.getBoundingClientRect();
      this.menuPos = { left: Math.round(r.left), top: Math.round(r.bottom + 6) };
    }
    this.menuOpen = !this.menuOpen;
  }

  update() {
    return (
      <div>
        <div class="clip">
          <div class="row">
            <button onClick={(e: Event) => this.toggleMenu(e)}>
              {this.menuOpen ? "Close menu" : "Open menu"}
            </button>
            <button onClick={() => (this.confirmOpen = true)}>Delete something</button>
          </div>

          <div
            popover="auto"
            style={`left: ${this.menuPos.left}px; top: ${this.menuPos.top}px`}
          >
            <menu>
              <li><button onClick={() => this.choose("Rename")}>Rename</button></li>
              <li><button onClick={() => this.choose("Duplicate")}>Duplicate</button></li>
              <li><button onClick={() => this.choose("Export")}>Export</button></li>
            </menu>
          </div>

          <p class="picked">Last choice: {this.picked}</p>
        </div>

        <dialog>
          <p>Delete this permanently? This cannot be undone.</p>
          <form method="dialog">
            <button value="cancel" onClick={() => (this.result = "cancelled")}>Cancel</button>
            <button value="ok" onClick={() => (this.result = "deleted")}>Delete</button>
          </form>
        </dialog>

        <p class="state">
          menuOpen <b>{String(this.menuOpen)}</b>
          {"  ·  "}confirmOpen <b>{String(this.confirmOpen)}</b>
          {this.result ? `  ·  last dialog result ${this.result}` : ""}
        </p>
      </div>
    );
  }
}
