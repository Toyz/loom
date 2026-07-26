/**
 * <doc-section> and <api-entry> — the page skeleton, defined once.
 *
 * Every reference page in these docs is the same shape, and until now that
 * shape was copy-pasted markup in 82 separate files:
 *
 *   <section>
 *     <div class="group-header"><h2>@interval</h2></div>
 *     <div class="feature-entry">
 *       <div class="dec-sig">@interval(ms)</div>
 *       <div class="dec-desc">…</div>
 *       <code-block …/>
 *     </div>
 *   </section>
 *
 * Duplicated that many times it drifts, and it did: entries appeared without
 * a signature, so a rail rendered with no punch; descriptions appeared
 * outside an entry at the wrong size; headings were wrapped three different
 * ways. Policing that by reading pages does not scale and did not work.
 *
 * So the skeleton lives here and the pages describe content:
 *
 *   <doc-section heading="@interval">
 *     <api-entry sig="@interval(ms: number)">
 *       <p>Starts a setInterval when the element connects.</p>
 *       <code-block lang="ts" code={…}></code-block>
 *     </api-entry>
 *   </doc-section>
 *
 * An <api-entry> always has a signature, because the signature is a required
 * prop. That is the point: the malformed state is now unrepresentable rather
 * than merely discouraged.
 *
 * Children are slotted, so they stay in the page's own tree and keep being
 * styled by the page's docStyles sheet. Only the wrapper markup lives in the
 * shadow root, which is why both components adopt docStyles themselves.
 */

import { LoomElement, component, prop, styles } from "@toyz/loom";
import { docStyles } from "../styles/doc-page";

@component("doc-section")
@styles(docStyles)
export class DocSection extends LoomElement {
  /** Rendered as the h2 under a weft rule. Omit for an unheaded section. */
  @prop accessor heading = "";

  update() {
    return (
      <section>
        {this.heading ? (
          <div class="group-header">
            <h2>{this.heading}</h2>
          </div>
        ) : null}
        <slot></slot>
      </section>
    );
  }
}

@component("api-entry")
@styles(docStyles)
export class ApiEntry extends LoomElement {
  /**
   * The signature, e.g. "@interval(ms: number)". Required — an entry without
   * one is a plain block of prose and should not be an entry at all.
   */
  @prop accessor sig = "";

  update() {
    return (
      <div class="feature-entry">
        <div class="dec-sig">{this.sig}</div>
        <slot></slot>
      </div>
    );
  }
}
