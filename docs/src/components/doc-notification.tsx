/**
 * Doc Notification — Callout / Alert Banner
 *
 * Shadow DOM component with <slot> for content.
 * Styled to match the .callout aesthetic from first-app.
 * Supports types: note (indigo), tip (emerald), warning (amber), caution (rose).
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
    border-radius: var(--radius-md, 8px);
    padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
    margin: var(--space-4, 1rem) 0;
    font-size: var(--text-sm, 0.8125rem);
    line-height: 1.6;
  }

  .wrap {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3, 0.75rem);
  }

  .wrap > loom-icon {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .body {
    flex: 1;
    min-width: 0;
  }

  /* ── Note (indigo / accent) ── */
  :host([type="note"]) {
    background: var(--accent-glow, rgba(129, 140, 248, 0.12));
    border: 1px solid var(--accent-dim, #6366b0);
    color: var(--text-secondary, #9898ad);
  }

  /* ── Tip (emerald) ── */
  :host([type="tip"]) {
    background: rgba(52, 211, 153, 0.12);
    border: 1px solid rgba(52, 211, 153, 0.35);
    color: var(--text-secondary, #9898ad);
  }

  /* ── Warning (amber) ── */
  :host([type="warning"]) {
    background: rgba(251, 191, 36, 0.1);
    border: 1px solid rgba(251, 191, 36, 0.3);
    color: var(--text-secondary, #9898ad);
  }

  /* ── Caution (rose) ── */
  :host([type="caution"]) {
    background: rgba(244, 114, 182, 0.1);
    border: 1px solid rgba(244, 114, 182, 0.3);
    color: var(--text-secondary, #9898ad);
  }

  /* Slotted inline elements */
  ::slotted(.ic) {
    display: inline !important;
    font-family: var(--font-mono, monospace);
    font-size: 0.8em;
    padding: 0.15em 0.4em;
    border-radius: 4px;
    background: rgba(129, 140, 248, 0.1);
    color: var(--accent, #818cf8);
  }

  ::slotted(code) {
    display: inline !important;
    font-family: var(--font-mono, monospace);
    font-size: 0.8em;
    padding: 0.15em 0.4em;
    border-radius: 4px;
    background: rgba(129, 140, 248, 0.1);
    color: var(--accent, #818cf8);
  }

  ::slotted(loom-link) {
    display: inline !important;
  }

  ::slotted(strong) {
    color: var(--accent, #818cf8);
  }

  ::slotted(loom-icon) {
    display: inline-flex !important;
    vertical-align: middle;
  }
`;

const ICON_MAP: Record<string, { name: string; color: string }> = {
  note: { name: "alert-circle", color: "var(--accent, #818cf8)" },
  tip: { name: "sparkles", color: "var(--emerald, #34d399)" },
  warning: { name: "alert-triangle", color: "var(--amber, #fbbf24)" },
  caution: { name: "shield", color: "var(--rose, #f472b6)" },
};

@component("doc-notification")
@styles(notifStyles)
export class DocNotification extends LoomElement {
  @prop accessor type: "note" | "tip" | "warning" | "caution" = "note";

  update() {
    const icon = ICON_MAP[this.type] ?? ICON_MAP.note;
    return (
      <div class="wrap">
        <loom-icon name={icon.name} size={16} color={icon.color}></loom-icon>
        <div class="body">
          <slot></slot>
        </div>
      </div>
    );
  }
}
