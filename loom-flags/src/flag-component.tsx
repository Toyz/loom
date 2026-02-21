/**
 * LoomFlags — <loom-flag> component
 *
 * Conditional rendering via named slots:
 *
 * ```tsx
 * <loom-flag name="beta-feature">
 *   <new-widget slot="enabled" />
 *   <span slot="disabled">Coming soon…</span>
 * </loom-flag>
 * ```
 *
 * Listens for FlagChanged bus events to swap slots reactively.
 */

import { LoomElement, component, prop, css, styles, reactive, app, on, mount } from "@toyz/loom";
import { FlagProvider } from "./provider";
import { FlagChanged } from "./events";

const flagStyles = css`
  :host { display: contents; }
`;

@component("loom-flag")
@styles(flagStyles)
class LoomFlagElement extends LoomElement {
  @prop accessor name = "";
  @reactive accessor enabled = false;

  @mount
  private _init() {
    if (!this.name) return;
    try {
      this.enabled = app.get(FlagProvider).isEnabled(this.name);
    } catch {
      this.enabled = false;
    }
  }

  @on(FlagChanged)
  private _onFlagChanged(event: FlagChanged) {
    if (event.flag === this.name) {
      this.enabled = event.enabled;
    }
  }

  update() {
    return this.enabled
      ? <slot name="enabled" />
      : <slot name="disabled" />;
  }
}

export { LoomFlagElement };
