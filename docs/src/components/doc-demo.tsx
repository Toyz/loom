/**
 * <doc-demo> — the frame every live demo sits in.
 *
 * A code block on these pages is obviously an object: bounded, with a header
 * strip naming the language and a punched gutter down its edge. The demos
 * beside them had no frame at all — they floated in the prose, so the one
 * thing on the page that is actually *running* read as less substantial than
 * a static listing of it.
 *
 * This gives a demo the same surface as a code block, deliberately: same
 * ground, same border, same clipped corner, same mono header strip. The
 * difference is the strip says LIVE rather than TSX, and it is the only place
 * in the design that gets to say that.
 *
 *   <doc-demo label="Todo list" note="Add items, then reload the page">
 *     <todo-list></todo-list>
 *   </doc-demo>
 *
 * Children are slotted, so a demo keeps its own shadow root and styles.
 */

import { LoomElement, component, prop, css, styles } from "@toyz/loom";

const demoStyles = css`
  :host {
    display: block;
    margin-bottom: var(--space-5, 1.25rem);
  }

  /* The same object a <code-block> is. */
  .frame {
    background: var(--ground-sunk, #100f0b);
    border: 1px solid var(--warp-lit, #4a4839);
    clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%);
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-4, 1rem);
    padding: 9px 20px 9px 16px;
    border-bottom: 1px solid var(--warp, #33322a);
    font-family: var(--font-mono, monospace);
    font-size: 0.6875rem;
    letter-spacing: 0.06em;
    color: var(--text-muted, #6d6858);
  }

  /* The one element allowed to claim it is running. */
  .live {
    display: flex;
    align-items: center;
    gap: 7px;
    flex: 0 0 auto;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--thread, #c4472f);
  }
  .live::before {
    content: '';
    width: 6px;
    height: 6px;
    background: var(--thread, #c4472f);
  }

  .label { color: var(--text-secondary, #a09a88); }

  .body { padding: var(--space-5, 1.25rem) var(--space-5, 1.25rem); }

  /* A one-line instruction, printed on the frame rather than floating above
     it in the prose where it read as part of the article. */
  .note {
    padding: 10px 16px;
    border-top: 1px solid var(--warp, #33322a);
    font-family: var(--font-mono, monospace);
    font-size: 0.6875rem;
    line-height: 1.5;
    color: var(--text-muted, #6d6858);
  }
`;

@component("doc-demo")
@styles(demoStyles)
export class DocDemo extends LoomElement {
  /** What the demo is, printed at the right of the strip. */
  @prop accessor label = "";

  /** One line of instruction, printed along the foot. */
  @prop accessor note = "";

  update() {
    return (
      <div class="frame">
        <div class="head">
          <span class="live">Live</span>
          {this.label ? <span class="label">{this.label}</span> : null}
        </div>
        <div class="body">
          <slot></slot>
        </div>
        {this.note ? <div class="note">{this.note}</div> : null}
      </div>
    );
  }
}
