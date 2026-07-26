/**
 * <punch-matrix> — the signature element.
 *
 * One card, many rows. A Jacquard card is a single piece of stock with a grid
 * of positions punched across it, and reading it means comparing rows down a
 * column. An earlier version rendered one card per API, which stacked five
 * slabs of card stock down the page: heavy, repetitive, and it made the
 * comparison harder rather than easier, because the columns no longer lined
 * up in a single grid.
 *
 *   <punch-matrix
 *     columns="SELF-FIRES,WRAPS,RUNS HIDDEN"
 *     rows={[{ name: "@interval", punches: "SELF-FIRES", note: "..." }]}
 *   />
 *
 * Columns are chosen per family and must discriminate. If every row ends up
 * with the same pattern, the columns are wrong and the matrix should not be
 * used at all — it would be decoration pretending to be data.
 */

import { LoomElement, component, prop, css, styles } from "@toyz/loom";

export interface PunchRow {
  /** API name, e.g. "@interval". */
  name: string;
  /** Comma-separated column names to punch. */
  punches: string;
  /** Optional short annotation printed under the name. */
  note?: string;
}

const split = (s: string): string[] =>
  s.split(",").map((p) => p.trim()).filter(Boolean);

const matrixStyles = css`
  :host {
    display: block;
    margin: var(--space-5) 0 var(--space-6);
  }

  /* Same surface as <code-block>, down to the token.
     A light slab this size is a glare panel on a dark page, and dimming the
     stock only made it a duller glare panel -- the problem was the area, not
     the value. The card now sits on the code block's ground with the code
     block's border, its row-label column is the code block's gutter, and a
     punch is the same thread red as a marked line in the gutter. Two elements
     that both mean "here is a grid of marked positions" should not be two
     different objects. */
  .card {
    background: var(--ground-sunk);
    color: var(--text-primary);
    border: 1px solid var(--warp-lit);
    clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
  }

  th, td {
    padding: 9px 12px;
    text-align: center;
    white-space: nowrap;
  }

  thead th {
    font-size: 0.5625rem;
    font-weight: 500;
    letter-spacing: 0.11em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--warp-lit);
    vertical-align: bottom;
  }

  /* Row label column — the code block's gutter, in the same tone. */
  th.row-name, td.row-name {
    text-align: left;
    padding-left: 16px;
    width: 1%;
    background: rgba(0, 0, 0, 0.22);
    border-right: 1px solid var(--warp);
  }

  tbody tr + tr td {
    border-top: 1px solid var(--warp);
  }

  .name {
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }
  .note {
    display: block;
    margin-top: 1px;
    font-family: var(--font-sans);
    font-size: 0.6875rem;
    font-weight: 400;
    color: var(--text-muted);
  }

  /* The position is a <loom-icon name="punch">, the same element the code
     block's gutter uses, so there is one punch in the system rather than a
     drawn one here and a CSS box there. */
  .pos {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: color-mix(in srgb, var(--text-muted) 62%, transparent);
  }
  /* Punched. Thread red, because that is already what "this line is marked"
     means in the gutter of every code block on the page. A second accent for
     the same idea would just be a second thing to learn. */
  .pos[data-punched] {
    color: var(--thread);
  }
`;

@component("punch-matrix")
@styles(matrixStyles)
export default class PunchMatrix extends LoomElement {
  /** Comma-separated column headers. */
  @prop accessor columns = "";
  /** Rows, passed as a JS array from JSX. */
  @prop accessor rows: PunchRow[] = [];

  update() {
    const cols = split(this.columns);
    if (!cols.length || !this.rows.length) return <div></div>;

    return (
      <div class="card">
        <table>
          <thead>
            <tr>
              <th class="row-name"></th>
              {cols.map((c) => <th>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {this.rows.map((row) => {
              const on = new Set(split(row.punches).map((p) => p.toUpperCase()));
              const isOn = (c: string) => on.has(c.toUpperCase());
              // The grid says nothing to a screen reader, so each row states
              // its pattern in words — including the negatives, since "not
              // RUNS HIDDEN" is usually the fact the reader came for.
              const yes = cols.filter(isOn);
              const no = cols.filter((c) => !isOn(c));
              const label =
                `${row.name}: ` +
                (yes.length ? yes.join(", ") : "none") +
                (no.length ? `; not ${no.join(", ")}` : "");

              return (
                <tr>
                  <td class="row-name">
                    <span class="name">{row.name}</span>
                    {row.note ? <span class="note">{row.note}</span> : null}
                    <span class="sr-only" hidden>{label}</span>
                  </td>
                  {cols.map((c) => (
                    <td aria-label={`${c}: ${isOn(c) ? "yes" : "no"}`}>
                      <span class="pos" data-punched={isOn(c)}>
                        <loom-icon
                          name="punch"
                          size={17}
                          strokeWidth={1.15}
                          fill={isOn(c) ? "currentColor" : "none"}
                        ></loom-icon>
                      </span>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }
}
