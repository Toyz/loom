/**
 * LoomFlags — FlagChanged event
 *
 * Dispatched on the Loom bus when a flag's state changes.
 * Consumed by @flag decorators and <loom-flag> components
 * to reactively update the UI.
 */

import { LoomEvent } from "@toyz/loom";

export class FlagChanged extends LoomEvent {
  constructor(
    public readonly flag: string,
    public readonly enabled: boolean,
    public readonly variant?: string,
  ) {
    super();
  }
}
