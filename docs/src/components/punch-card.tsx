/**
 * <punch-card> — the signature element.
 *
 * A Jacquard card encodes, per row, which warp threads the loom lifts. This
 * card encodes, per API, which properties hold. A punched position means yes.
 *
 *   <punch-card
 *     name="@interval"
 *     columns="AUTO,WRAPS,HIDDEN,FRAME"
 *     punches="AUTO,HIDDEN">
 *   </punch-card>
 *
 * The columns are chosen per family, and they must be the axes that actually
 * separate the members of that family. On the timing page, every decorator
 * hooks connect and disconnect, so a lifecycle card would be five identical
 * patterns saying nothing — the useful axes there are whether it self-fires,
 * whether it replaces your method, and whether it survives a hidden tab.
 *
 * If a set of columns produces the same pattern for every row, it is the wrong
 * set of columns, and the card should not be used at all.
 */

import { LoomElement, component, prop, css, styles } from "@toyz/loom";

/** Default columns: the four lifecycle phases, in the order they occur. */
const DEFAULT_COLUMNS = "CONN,RNDR,UPDT,DISC";

const cardStyles = css`
  :host {
    display: block;
    /* Cards in a Jacquard chain are laced together with a visible gap. Without
       it a run of them reads as one slab and the pattern stops being legible
       card-by-card. */
    margin-bottom: 6px;
  }
  :host(:last-of-type) {
    margin-bottom: var(--space-5);
  }

  .card {
    /* Card stock. One of the few places the material appears — it marks a
       physical artifact, not a generic container. */
    background: var(--card);
    color: var(--card-ink);
    border: 1px solid var(--card-edge);
    /* The clipped top-right corner is how a real punch card is oriented in the
       reader, so it always sits the same way up. */
    clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 13px, 100% 100%, 0 100%);
    padding: var(--space-3) var(--space-5) var(--space-3) var(--space-4);
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: var(--space-5);
  }

  .name {
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--card-ink);
    letter-spacing: -0.01em;
  }

  .note {
    display: block;
    margin-top: 2px;
    font-family: var(--font-sans);
    font-size: var(--text-xs);
    font-weight: 400;
    /* Ink fades on old stock; this is the printed annotation, not the punch. */
    color: color-mix(in srgb, var(--card-ink) 55%, transparent);
    letter-spacing: 0;
  }

  .rows {
    display: flex;
    gap: var(--space-3);
  }

  .col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 52px;
  }

  .label {
    font-family: var(--font-mono);
    font-size: 0.5625rem;
    font-weight: 500;
    letter-spacing: 0.09em;
    color: color-mix(in srgb, var(--card-ink) 45%, transparent);
  }

  /* An unpunched position: the printed guide ring on blank stock. */
  .pos {
    width: 10px;
    height: 13px;
    border: 1px solid color-mix(in srgb, var(--card-ink) 22%, transparent);
    border-radius: 1px;
    background: transparent;
  }

  /* A punched position: material removed, so you see through to the ground. */
  .pos[data-punched] {
    background: var(--ground);
    border-color: var(--ground);
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.55);
  }

  @media (max-width: 560px) {
    .card {
      grid-template-columns: 1fr;
      gap: var(--space-3);
    }
    .rows { gap: var(--space-3); }
  }
`;

const split = (s: string): string[] =>
  s.split(",").map((p) => p.trim()).filter(Boolean);

@component("punch-card")
@styles(cardStyles)
export default class PunchCard extends LoomElement {
  /** API name, e.g. "@interval". */
  @prop accessor name = "";
  /** Comma-separated column headers. Defaults to the lifecycle phases. */
  @prop accessor columns = DEFAULT_COLUMNS;
  /** Comma-separated column names to punch. Must match `columns` entries. */
  @prop accessor punches = "";
  /** Optional one-line annotation printed under the name. */
  @prop accessor note = "";

  update() {
    const cols = split(this.columns);
    const on = new Set(split(this.punches).map((p) => p.toUpperCase()));
    const isOn = (c: string) => on.has(c.toUpperCase());

    // The grid alone conveys nothing to a screen reader, so state the pattern
    // in words. Both the yes and the no list matter: "not HIDDEN" is the fact
    // a reader came for.
    const yes = cols.filter(isOn);
    const no = cols.filter((c) => !isOn(c));
    const label =
      `${this.name}: ` +
      (yes.length ? `${yes.join(", ")}` : "none") +
      (no.length ? `; not ${no.join(", ")}` : "");

    return (
      <div class="card" role="img" aria-label={label}>
        <div>
          <div class="name">{this.name}</div>
          {this.note ? <span class="note">{this.note}</span> : null}
        </div>
        <div class="rows" aria-hidden="true">
          {cols.map((col) => (
            <div class="col">
              <span class="label">{col}</span>
              <span class="pos" data-punched={isOn(col)}></span>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
