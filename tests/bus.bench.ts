/**
 * bus.emit — the dedupeKey read happens on every single emit.
 *
 * LoomEvent.dedupeKey used to be a getter returning undefined outright. It
 * now consults `static dedupe` first, which is a prototype-chain lookup on
 * the hot path, so the no-dedup case is the one that has to stay free.
 */
import { bench, describe } from "vitest";
import { LoomEvent } from "../src/event";
import { bus } from "../src/bus";

class Plain extends LoomEvent {
  constructor(public readonly n: number) { super(); }
}
class Payload extends LoomEvent<{ n: number }> {}
class Deduped extends LoomEvent<{ n: number }> {
  static override dedupe = true;
}
class HandKey extends LoomEvent {
  constructor(public readonly n: number) { super(); }
  override get dedupeKey() { return `hand:${this.n}`; }
}

bus.on(Plain, () => {});
bus.on(Payload, () => {});
bus.on(Deduped, () => {});
bus.on(HandKey, () => {});

describe("bus.emit", () => {
  bench("classic event, no dedup", () => {
    bus.emit(new Plain(1));
  });

  bench("payload event, no dedup", () => {
    bus.emit(new Payload({ n: 1 }));
  });

  bench("hand-written dedupeKey", () => {
    bus.emit(new HandKey(1));
  });

  bench("derived dedupeKey", () => {
    bus.emit(new Deduped({ n: 1 }));
  });
});
