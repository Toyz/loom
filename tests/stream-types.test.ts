/**
 * @sse / @socket type parameters are real constraints, not decoration.
 *
 * createDecorator types the decorated method as `Function`, so a type argument
 * written at the call site would be accepted and never checked -- the handler
 * could take anything and `e.data` would be `any`. The decorators return a
 * narrowed decorator type so that stops being true.
 *
 * The @ts-expect-error lines are the assertion, checked by `npm run
 * test:types`. A directive that stops being an error fails that run.
 */
import { describe, it, expect } from "vitest";
import { LoomElement } from "../src/index.js";
import { sse, socket } from "../src/element/stream.js";

interface Price { amount: number; sym: string }

class Typed extends LoomElement {
  @sse<Price>("/prices", { json: true })
  onTick(e: MessageEvent<Price>) {
    const n: number = e.data.amount;   // typed all the way through
    void n;
  }

  @socket<Price>("wss://x", { json: true })
  onSocket(e: MessageEvent<Price>) {
    const s: string = e.data.sym;
    void s;
  }

  // Defaults to string, which is what the transport actually delivers.
  @sse("/raw")
  onRaw(e: MessageEvent<string>) {
    const s: string = e.data;
    void s;
  }
}

class Mismatched extends LoomElement {
  // @ts-expect-error a Price stream cannot be read as a string
  @sse<Price>("/prices")
  onTick(e: MessageEvent<string>) { void e; }
}

describe("stream typing", () => {
  it("compiles the typed forms", () => {
    expect(Typed).toBeTruthy();
    expect(Mismatched).toBeTruthy();
  });
});
