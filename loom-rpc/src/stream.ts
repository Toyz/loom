/**
 * LoomRPC — @stream / @onStream decorators
 *
 * @stream — Auto-accessor decorator for server-push streams.
 * @onStream — Method decorator that wires a stream handler on a LoomElement.
 *
 * ```ts
 * import { stream, onStream } from "@toyz/loom-rpc";
 *
 * // eager (default) — opens automatically on connectedCallback
 * @stream(ChatRouter, "messages", { fn: el => [el.roomId] })
 * accessor chatMessages!: RpcStream<ChatMessage>;
 *
 * // callback-style (component)
 * @onStream("chatMessages")
 * onMessage(msg: ChatMessage) {
 *   this.msgs.push(msg);
 *   this.scheduleUpdate();
 * }
 *
 * // direct iteration (service / advanced)
 * for await (const msg of this.chatMessages) { ... }
 *
 * // manual — must call open() yourself
 * @stream(ChatRouter, "history", { fn: el => [el.roomId], eager: false })
 * accessor history!: RpcStream<ChatMessage>;
 * this.history.open();
 * ```
 */

import { app, createSymbol } from "@toyz/loom";
import { Reactive } from "@toyz/loom/store";
import type { RpcMethods, RpcStream, RpcStreamOptions } from "./types";
import { RpcTransport } from "./transport";
import { resolveServiceName } from "./service";

/** Symbol for inspect() introspection */
export const RPC_STREAMS = createSymbol("rpc:streams");

// ──────────────────────────────────────────────────────────────────────────────
// @stream decorator
// ──────────────────────────────────────────────────────────────────────────────

/**
 * @stream(Router, method, opts?) — streaming auto-accessor decorator.
 *
 * Returns an `RpcStream<T>` which is also directly iterable:
 *   `for await (const x of this.myStream) { ... }`
 *
 * By default (`eager: true`) the stream opens automatically in
 * `connectedCallback`. Set `eager: false` and call `.open()` manually.
 *
 * Requires the registered `RpcTransport` to implement `stream()`.
 */
export function stream<
  TRouter extends object,
  TMethod extends RpcMethods<TRouter>,
>(
  router: new (...args: any[]) => TRouter,
  method: TMethod,
  opts?: RpcStreamOptions<TRouter, TMethod>,
) {
  type T = TRouter[TMethod] extends (...args: any[]) => AsyncIterable<infer U>
    ? U
    : TRouter[TMethod] extends (...args: any[]) => Promise<infer U>
      ? U
      : unknown;

  const routerName = resolveServiceName(router);

  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, RpcStream<T>>,
    context: ClassAccessorDecoratorContext<This, RpcStream<T>>,
  ): ClassAccessorDecoratorResult<This, RpcStream<T>> => {
    const stateKey = Symbol(`stream:${String(context.name)}`);
    const traceKey = Symbol(`stream:trace:${String(context.name)}`);
    const accessorName = String(context.name);

    context.addInitializer(function (this: any) {
      const ctor = this.constructor;
      ctor[RPC_STREAMS.key] ??= [];
      ctor[RPC_STREAMS.key].push({
        accessor: accessorName,
        router: routerName,
        method: String(method),
      });
    });

    return {
      get(this: any): RpcStream<T> {
        if (!this[stateKey]) {
          const sentinel = new Reactive(0);
          this[traceKey] = sentinel;
          sentinel.subscribe(() => this.scheduleUpdate?.());
          const notify = () => { sentinel.set((v: number) => v + 1); };

          this[stateKey] = createStreamState<T>(
            routerName,
            method as string,
            opts,
            notify,
            this,
          );
        }
        (this[traceKey] as Reactive<number>).value;
        return this[stateKey];
      },
      set(this: any, _val: RpcStream<T>) {
        // State is managed internally
      },
    };
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal state factory
// ──────────────────────────────────────────────────────────────────────────────

/** @internal — exported so tests can create state directly without decorators */
export function createStreamState<T>(
  routerName: string,
  method: string,
  opts: RpcStreamOptions<any, any> | undefined,
  scheduleUpdate: () => void,
  host: any,
): RpcStream<T> & { _subscribe(cb: (e: T) => void): () => void } {
  type Status = RpcStream<T>["status"];
  let status: Status = "idle";
  let error: Error | null = null;

  // Subscriber callbacks registered by @onStream — fed by the shared pump
  const subscribers = new Set<(event: T) => void>();

  // Active iterator — held so close() can terminate the pump
  let activeIterator: AsyncIterator<T> | null = null;

  function setStatus(s: Status) {
    status = s;
    scheduleUpdate();
  }

  function getTransport(): { transport: RpcTransport; ok: true } | { ok: false; error: Error } {
    try {
      return { transport: app.get(RpcTransport), ok: true };
    } catch {
      return {
        ok: false,
        error: new Error(
          "[LoomRPC] No RpcTransport registered. " +
          "Call app.use(RpcTransport, ...) before app.start().",
        ),
      };
    }
  }

  /**
   * Shared pump — one connection per RpcStream, fans out to all @onStream subscribers.
   * Called by open(). No-op if already streaming.
   */
  async function pump(): Promise<void> {
    if (status === "streaming") return;

    const result = getTransport();
    if (!result.ok) { error = result.error; setStatus("error"); return; }
    const { transport } = result;

    if (!transport.stream) {
      error = new Error(
        "[LoomRPC] The registered RpcTransport does not implement stream(). " +
        "Use a transport that supports streaming (e.g. WsTransport).",
      );
      setStatus("error");
      return;
    }

    const args: any[] = opts?.fn ? (opts.fn(host) as any[]) : [];

    let iterable: AsyncIterable<T>;
    try {
      iterable = transport.stream<T>(routerName, method, args);
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      setStatus("error");
      return;
    }

    setStatus("streaming");
    try {
      activeIterator = iterable[Symbol.asyncIterator]();
      while (true) {
        const { value, done } = await activeIterator.next();
        if (done) break;
        for (const cb of subscribers) cb(value);
      }
      setStatus("closed");
    } catch (e) {
      if (status !== "closed") {
        error = e instanceof Error ? e : new Error(String(e));
        setStatus("error");
      }
    } finally {
      activeIterator = null;
    }
  }

  /**
   * Raw iterable — each call creates an independent generator, separate from
   * the pump. Used for `for await (const x of stream)` and `.events`.
   */
  function makeIterable(): AsyncIterable<T> {
    return {
      [Symbol.asyncIterator](): AsyncIterator<T> {
        const r = getTransport();
        if (!r.ok) {
          return {
            async next() {
              error = r.error;
              setStatus("error");
              return { value: undefined as any, done: true };
            },
          };
        }
        const { transport } = r;
        if (!transport.stream) {
          return {
            async next() {
              error = new Error("[LoomRPC] Transport does not implement stream().");
              setStatus("error");
              return { value: undefined as any, done: true };
            },
          };
        }
        const args: any[] = opts?.fn ? (opts.fn(host) as any[]) : [];
        setStatus("streaming");
        const inner = transport.stream<T>(routerName, method, args)[Symbol.asyncIterator]();
        return {
          async next() {
            try {
              const result = await inner.next();
              if (result.done) setStatus("closed");
              return result;
            } catch (e) {
              if (status !== "closed") {
                error = e instanceof Error ? e : new Error(String(e));
                setStatus("error");
              }
              return { value: undefined as any, done: true };
            }
          },
          return() {
            setStatus("closed");
            return inner.return?.() ?? Promise.resolve({ value: undefined as any, done: true });
          },
        };
      },
    };
  }

  const iterable = makeIterable();

  const state = {
    get status() { return status; },
    get error() { return error; },

    open(): void { pump(); },

    close(): void {
      if (activeIterator) {
        activeIterator.return?.();
        activeIterator = null;
      }
      setStatus("closed");
    },

    get events(): AsyncIterable<T> { return iterable; },

    [Symbol.asyncIterator](): AsyncIterator<T> {
      return iterable[Symbol.asyncIterator]();
    },

    /** @internal — used by @onStream */
    _subscribe(cb: (event: T) => void): () => void {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
  };

  return state as RpcStream<T> & { _subscribe(cb: (e: T) => void): () => void };
}

// ──────────────────────────────────────────────────────────────────────────────
// @onStream decorator
// ──────────────────────────────────────────────────────────────────────────────

/** @internal — same singleton key that LoomElement.connectedCallback reads */
const CONNECT_HOOKS = createSymbol<Array<(el: any) => (() => void) | void>>("connect:hooks");

/**
 * Wire a method as a handler for an `RpcStream` accessor on a `LoomElement`.
 *
 * - Subscribes to the shared pump in `connectedCallback` (via `CONNECT_HOOKS`)
 * - Auto-opens the stream if still idle
 * - Unsubscribes and closes on disconnect (cleanup fn returned to `CONNECT_HOOKS`)
 *
 * ```ts
 * @onStream("chatMessages")
 * onMessage(msg: ChatMessage) {
 *   this.msgs.push(msg);
 *   this.scheduleUpdate();
 * }
 * ```
 */
export function onStream(accessorName: string) {
  return function <This extends object>(
    _target: (this: This, value: any) => void,
    context: ClassMethodDecoratorContext<This>,
  ) {
    const handlerKey = context.name;

    context.addInitializer(function (this: any) {
      // Use the same CONNECT_HOOKS array that LoomElement.connectedCallback reads.
      // createSymbol is a singleton registry so "connect:hooks" always resolves
      // to the same LoomSymbol regardless of which package calls it.
      if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];

      this[CONNECT_HOOKS.key].push((el: any) => {
        const s = el[accessorName] as RpcStream<any> & {
          _subscribe?(cb: (e: any) => void): () => void;
        };
        if (!s) return;

        if (typeof s._subscribe === "function") {
          const unsub = s._subscribe((event: any) => {
            (el[handlerKey] as (e: any) => void).call(el, event);
          });
          // Return cleanup — LoomElement.disconnectedCallback calls these
          return () => {
            unsub();
            (el[accessorName] as RpcStream<any>)?.close();
          };
        }

        if (s.status === "idle") s.open();
      });
    });
  };
}
