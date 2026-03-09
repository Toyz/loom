import { LoomElement, component, css, styles, prop } from "@toyz/loom";
import { readonly } from "@toyz/loom/store";

const tooltipStyles = css`
  :host {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: default;
  }

  .tip {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%) scale(0.95);
    padding: 4px 10px;
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 6px;
    font-size: 0.65rem;
    font-weight: 500;
    color: #e0e0e0;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s, transform 0.15s;
    z-index: 1000;
  }

  :host(:hover) .tip {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
`;

@component("doc-tooltip")
@styles(tooltipStyles)
export class DocTooltip extends LoomElement {
  @readonly @prop accessor text = "";

  update() {
    return (
      <>
        <slot />
        <div class="tip">{this.text}</div>
      </>
    );
  }
}
