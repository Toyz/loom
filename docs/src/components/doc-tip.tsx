/**
 * <doc-tip> — an @attribute controller that explains a decorator on hover.
 *
 * Every decorator token rendered inside a code block gets `doc-tip="interval"`,
 * and this controller attaches itself to it. The docs therefore document
 * decorators using the decorator-attaching feature they document, which is the
 * point: if @attribute could not do this cleanly, that would be worth knowing.
 *
 * Why an attribute controller rather than a wrapper component: the tokens are
 * produced as raw highlighted HTML inside code-block's shadow root. There is no
 * component boundary to hang a tooltip off, and wrapping every token in a
 * custom element would cost one element per token. An attribute attaches to
 * markup that already exists.
 */

import { LoomAttribute, attribute, styles } from "@toyz/loom/element";
import { reactive, css } from "@toyz/loom";
import { DECORATOR_HELP } from "../data/decorator-help";

const tipStyles = css`
  .tip {
    position: fixed;
    z-index: 400;
    max-width: 21rem;
    background: var(--card, #b9b099);
    color: var(--card-ink, #16150f);
    border: 1px solid var(--card-edge, #a1977e);
    /* Clipped corner: it is a small card, like everything else in this system. */
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%);
    padding: 10px 13px 11px;
    box-shadow: 0 6px 22px rgba(0, 0, 0, 0.45);
    pointer-events: none;
  }
  .name {
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    margin-bottom: 3px;
  }
  .summary {
    font-family: var(--font-sans, sans-serif);
    font-size: 0.8125rem;
    line-height: 1.45;
    color: color-mix(in srgb, var(--card-ink, #16150f) 78%, transparent);
  }
  /* The path, not a sentence telling you to go read it. */
  .more {
    display: block;
    margin-top: 6px;
    font-family: var(--font-mono, monospace);
    font-size: 0.625rem;
    letter-spacing: 0.06em;
    white-space: nowrap;
    color: color-mix(in srgb, var(--card-ink, #16150f) 55%, transparent);
  }
`;

@attribute("doc-tip")
@styles(tipStyles)
export class DocTip extends LoomAttribute {
  @reactive accessor open = false;

  private x = 0;
  private y = 0;
  private flip = false;

  connect() {
    const show = () => {
      const r = this.el.getBoundingClientRect();
      // Prefer below the token; flip above when there is no room.
      this.flip = r.bottom + 120 > window.innerHeight;
      this.x = Math.max(8, Math.min(r.left, window.innerWidth - 360));
      this.y = this.flip ? r.top - 8 : r.bottom + 8;
      this.open = true;
    };
    const hide = () => { this.open = false; };

    this.el.addEventListener("mouseenter", show);
    this.el.addEventListener("mouseleave", hide);
    // Keyboard parity: the token is made focusable so the explanation is not
    // mouse-only.
    this.el.setAttribute("tabindex", "0");
    this.el.addEventListener("focus", show);
    this.el.addEventListener("blur", hide);

    this.track(() => {
      this.el.removeEventListener("mouseenter", show);
      this.el.removeEventListener("mouseleave", hide);
      this.el.removeEventListener("focus", show);
      this.el.removeEventListener("blur", hide);
      this.el.removeAttribute("tabindex");
    });
  }

  update(): Node | Node[] | void {
    if (!this.open) return;

    const key = this.value.replace(/^@/, "");
    const help = DECORATOR_HELP[key];
    if (!help) return;

    const style = this.flip
      ? `left:${this.x}px; top:${this.y}px; transform: translateY(-100%);`
      : `left:${this.x}px; top:${this.y}px;`;

    return (
      <div class="tip" style={style} role="tooltip">
        <div class="name">{`@${key}`}</div>
        <div class="summary">{help.summary}</div>
        <span class="more">{help.to}</span>
      </div>
    );
  }
}
