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
import { t } from "../tokens";

const demoStyles = css`
  :host {
    display: block;
    margin-bottom: ${t.space5};
  }

  /* The same object a <code-block> is. */
  .frame {
    background: ${t.groundSunk};
    border: 1px solid ${t.warpLit};
    clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%);
  }

  .head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: ${t.space4};
    padding: 9px 20px 9px 16px;
    border-bottom: 1px solid ${t.warp};
    font-family: ${t.fontMono};
    font-size: 0.6875rem;
    letter-spacing: 0.06em;
    color: ${t.textMuted};
  }

  /* The one element allowed to claim it is running. */
  .live {
    display: flex;
    align-items: center;
    gap: 7px;
    flex: 0 0 auto;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: ${t.thread};
  }
  .live::before {
    content: '';
    width: 6px;
    height: 6px;
    background: ${t.thread};
  }

  .label { color: ${t.textSecondary}; }

  .body { padding: ${t.space5} ${t.space5}; }

  /* A one-line instruction, printed on the frame rather than floating above
     it in the prose where it read as part of the article. */
  .note {
    padding: 10px 16px;
    border-top: 1px solid ${t.warp};
    font-family: ${t.fontMono};
    font-size: 0.6875rem;
    line-height: 1.5;
    color: ${t.textMuted};
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
