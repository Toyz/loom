/**
 * <doc-notification> — a callout.
 *
 * Renders identically to the .note / .tip / .warning / .caution classes in
 * styles/doc-page.ts. Both exist because a callout containing rich markup is
 * easier to slot into a component than to write as a bare class, but a reader
 * must never be able to tell which one a given page used.
 *
 * Four levels, separated by rule weight and one printed word. No icon, no
 * radius, no tinted fill except at the strongest level — a callout is an aside
 * in the margin of the page, not a card sitting on top of it.
 *
 * Usage:
 *   <doc-notification type="note">
 *     <span class="ic">@reactive</span> triggers re-renders...
 *   </doc-notification>
 */

import { LoomElement, component, css, styles } from "@toyz/loom";
import { prop } from "@toyz/loom/store";

const notifStyles = css`
  :host {
    display: block;
    border-radius: 0;
    background: transparent;
    padding: var(--space-3, 0.75rem) 0 var(--space-3, 0.75rem) var(--space-4, 1rem);
    margin: 0 0 var(--space-4, 1rem);
    font-size: var(--text-sm, 0.8125rem);
    line-height: 1.65;
    color: var(--text-secondary, #a09a88);
  }

  /* The printed level label. Replaces the coloured icon that used to sit in
     a flex row to the left of the text. */
  .label {
    display: block;
    font-family: var(--font-mono, monospace);
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    margin-bottom: var(--space-1, 0.25rem);
  }

  :host([type="note"]) { border-left: 1px solid var(--indigo-dim, #47607a); }
  :host([type="note"]) .label { color: var(--indigo, #6b8cae); }

  :host([type="tip"]) { border-left: 1px solid var(--ok, #7f9c5a); }
  :host([type="tip"]) .label { color: var(--ok, #7f9c5a); }

  :host([type="warning"]) { border-left: 1px solid var(--warn, #c99a3d); }
  :host([type="warning"]) .label { color: var(--warn, #c99a3d); }

  /* Caution is the strongest level: a data-loss or security footgun, and the
     only one that earns a fill. */
  :host([type="caution"]) {
    border-left: 2px solid var(--thread, #c4472f);
    background: var(--thread-wash, rgba(196, 71, 47, 0.1));
    padding-right: var(--space-4, 1rem);
  }
  :host([type="caution"]) .label { color: var(--thread, #c4472f); }

  /* Slotted content matches docStyles exactly. Inline code is underlined,
     not boxed — a chip per identifier turns prose into a field of buttons. */
  ::slotted(.ic),
  ::slotted(code) {
    display: inline !important;
    font-family: var(--font-mono, monospace);
    font-size: 0.875em;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    border-bottom: 1px solid var(--thread-dim, #8f3423);
    color: var(--text-primary, #e6e1d3);
    overflow-wrap: break-word;
  }

  ::slotted(strong) {
    color: var(--text-primary, #e6e1d3);
    font-weight: 600;
  }

  ::slotted(loom-link) { display: inline !important; }

  ::slotted(loom-icon) {
    display: inline-flex !important;
    vertical-align: middle;
  }

  ::slotted(p) { margin: 0; }
`;

/** Printed in place of the old per-type icon. */
const LABELS: Record<string, string> = {
  note: "NOTE",
  tip: "TIP",
  warning: "CAUTION",
  caution: "DO NOT",
};

@component("doc-notification")
@styles(notifStyles)
export class DocNotification extends LoomElement {
  @prop accessor type: "note" | "tip" | "warning" | "caution" = "note";

  update() {
    return (
      <div>
        <span class="label">{LABELS[this.type] ?? LABELS.note}</span>
        <slot></slot>
      </div>
    );
  }
}
