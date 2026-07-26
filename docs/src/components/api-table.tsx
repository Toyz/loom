/**
 * <api-table> — the reference table, defined once.
 *
 * There are 101 of these across the docs and they were all hand-written
 * markup: a table, a thead, a row of th, then a tbody of tr/td. That is the
 * same drift risk as the page skeleton before <doc-section> — a column count
 * that does not match its header, a missing tbody, a phase row styled by
 * hand — and it is a lot of noise around what is usually three words per
 * cell.
 *
 *   <api-table
 *     head={["Prop", "Type", "Description"]}
 *     rows={[
 *       [<code>src</code>, "string", "Image URL"],
 *       { phase: "re-render loop" },
 *       [<code>alt</code>, "string", "Alt text"],
 *     ]}
 *   ></api-table>
 *
 * Cells take a string or a node, because most of them carry a <code> or a
 * link. Loom's JSX builds real DOM eagerly, so a node in the array is just a
 * node — nothing is being serialised or parsed.
 *
 * A `{ phase }` row spans every column, for tables where the rows are a
 * sequence rather than a set.
 *
 * The table renders into the light DOM so the shared docStyles .api-table
 * rules keep applying, and so a page can still reach in for a one-off.
 */

import { LoomElement, component, prop } from "@toyz/loom";

/** A cell: plain text, or markup built by the page. */
export type Cell = string | Node;

/** A row of cells, or a full-width label between them. */
export type ApiRow = Cell[] | { phase: string };

const isPhase = (row: ApiRow): row is { phase: string } =>
  !Array.isArray(row) && typeof (row as { phase?: unknown }).phase === "string";

@component("api-table", { shadow: false })
export class ApiTable extends LoomElement {
  /** Column headings. Their count defines the table's width. */
  @prop accessor head: string[] = [];

  /** Body rows. */
  @prop accessor rows: ApiRow[] = [];

  update() {
    const head = this.head ?? [];
    const rows = this.rows ?? [];
    if (!rows.length) return <div></div>;

    const columns = head.length || Math.max(...rows.map((r) => (isPhase(r) ? 1 : r.length)));

    return (
      <table class="api-table">
        {head.length ? (
          <thead>
            <tr>{head.map((h) => <th>{h}</th>)}</tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((row) =>
            isPhase(row) ? (
              <tr>
                <td colSpan={columns} class="phase">{row.phase}</td>
              </tr>
            ) : (
              <tr>
                {row.map((cell) => <td>{cell}</td>)}
              </tr>
            ),
          )}
        </tbody>
      </table>
    );
  }
}
