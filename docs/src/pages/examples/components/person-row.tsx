/**
 * PersonRow — a Loom component used as a virtual list child.
 * Each instance has its own shadow DOM.
 */
import { LoomElement, component, prop, css, styles } from "@toyz/loom";
import { t } from "../../../tokens";

const sheet = css`
  :host {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.65rem 1rem;
    border-bottom: 1px solid ${t.border};
    font-size: 0.9rem;
    transition: background 0.15s;
  }
  :host(:hover) { background: ${t.surface2}; }
  .idx {
    font-family: ${t.fontMono};
    font-size: 0.75rem;
    color: ${t.textMuted};
    min-width: 4ch;
    text-align: right;
  }
  .name { flex: 1; }
  .tag {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 0;
    background: ${t.accentGlow};
    color: ${t.accent};
    border: 1px solid ${t.accentDim};
  }
`;

@component("person-row")
@styles(sheet)
export class PersonRow extends LoomElement {
  @prop accessor pid: number = 0;
  @prop accessor name: string = "";
  @prop accessor role: string = "";

  update() {
    return (
      <>
        <span class="idx">{this.pid}</span>
        <span class="name">{this.name}</span>
        <span class="tag">{this.role}</span>
      </>
    );
  }
}
