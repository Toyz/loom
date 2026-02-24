/**
 * Loom Router — Events
 */

import { LoomEvent } from "../event";

/** Emitted on every navigation */
export class RouteChanged extends LoomEvent {
  constructor(
    public readonly path: string,
    public readonly params: Record<string, string>,
    public readonly previous: string,
    public readonly meta: Record<string, unknown> = {},
  ) {
    super();
  }
}
