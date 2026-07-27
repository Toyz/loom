/**
 * Loom — @sse and @socket
 *
 * Long-lived connections, with the two things everybody writes by hand and
 * gets subtly wrong: reconnection with backoff, and closing on disconnect.
 *
 * The leak is the quiet one. A WebSocket opened in `connectedCallback` keeps
 * its handlers -- and therefore the component, and therefore its whole DOM
 * subtree -- reachable after the element is gone, and a reconnect timer keeps
 * firing against a detached host. Route between two pages a few times and
 * there are several live sockets and no way to tell from the UI.
 *
 * ```ts
 * @component("live-prices")
 * class LivePrices extends LoomElement {
 *   @reactive accessor price = 0;
 *
 *   @socket("wss://example.com/prices")
 *   onTick(msg: MessageEvent) { this.price = JSON.parse(msg.data).price; }
 * }
 * ```
 *
 * Both pause while the page is hidden by default -- a backgrounded tab
 * holding an open stream costs battery and server connections to deliver
 * messages nobody sees.
 */

import { createDecorator } from "../decorators/create.js";
import { isVisible, onVisibilityChange } from "../env.js";

export interface StreamOptions {
  /**
   * Reconnect after a drop (default: true), with exponential backoff.
   */
  reconnect?: boolean;
  /** First backoff delay in ms (default: 1000). */
  retryDelay?: number;
  /** Ceiling for the backoff (default: 30000). */
  maxDelay?: number;
  /**
   * Close while the page is hidden and reopen on return (default: true).
   *
   * A backgrounded tab holding an open stream costs battery and a server
   * connection to deliver messages nobody is looking at.
   */
  pauseWhenHidden?: boolean;
  /**
   * Parse `event.data` as JSON before handing it over (default: false).
   *
   * Both transports deliver strings, so a typed handler otherwise starts with
   * a `JSON.parse` and a cast on every message. With this on, `e.data` is the
   * parsed value and the type parameter is telling the truth rather than
   * describing an intention.
   *
   * A message that fails to parse goes to `onError` instead of reaching the
   * handler, so a single malformed frame cannot take the component down.
   */
  json?: boolean;
  /** Called on error. Without one, errors are logged. */
  onError?: (error: Event | Error, host: any) => void;
  /** Called whenever the connection opens, including reconnects. */
  onOpen?: (host: any) => void;
  /** Called whenever it closes. */
  onClose?: (host: any) => void;
}

/** What both drivers need from a connection. */
interface Connection {
  close(): void;
}

/**
 * Shared connect/backoff/teardown machinery.
 *
 * `open` returns a connection plus how to tear it down; everything about
 * *when* to open, when to give up, and when to try again lives here so the
 * two decorators cannot drift apart on it.
 */
function makeStream(
  opts: StreamOptions,
  open: (
    onMessage: (e: MessageEvent) => void,
    onOpen: () => void,
    onError: (e: Event) => void,
    onClose: () => void,
  ) => Connection | null,
  deliver: (e: MessageEvent) => void,
  host: any,
) {
  const reconnect = opts.reconnect ?? true;
  const base = opts.retryDelay ?? 1000;
  const max = opts.maxDelay ?? 30_000;
  const pauseWhenHidden = opts.pauseWhenHidden ?? true;

  const deliverParsed = (e: MessageEvent) => {
    if (!opts.json) return deliver(e);
    try {
      // MessageEvent.data is readonly, so the parsed payload travels in a new
      // event rather than being written back onto the browser's.
      deliver(new MessageEvent(e.type, { data: JSON.parse(e.data as string) }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (opts.onError) opts.onError(error, host);
      else console.error("[loom] stream payload was not JSON", error);
    }
  };

  let conn: Connection | null = null;
  let attempt = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const clearRetry = () => {
    if (retryTimer !== null) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const close = () => {
    clearRetry();
    try { conn?.close(); } catch { /* already closing */ }
    conn = null;
  };

  const scheduleRetry = () => {
    if (!reconnect || stopped || retryTimer !== null) return;
    // Exponential, capped. Uncapped backoff on a server that is down for an
    // hour means the first request after it returns is an hour late.
    const delay = Math.min(base * 2 ** attempt, max);
    attempt++;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      connect();
    }, delay);
  };

  function connect(): void {
    if (stopped || conn) return;
    if (pauseWhenHidden && !isVisible()) return;

    conn = open(
      (e) => deliverParsed(e),
      () => {
        attempt = 0; // a successful open resets the backoff
        opts.onOpen?.(host);
      },
      (e) => {
        if (opts.onError) opts.onError(e, host);
        else console.error("[loom] stream error", e);
      },
      () => {
        conn = null;
        opts.onClose?.(host);
        scheduleRetry();
      },
    );
    if (!conn) scheduleRetry();
  }

  connect();

  const offVisibility = pauseWhenHidden
    ? onVisibilityChange((visible) => {
        if (visible) { attempt = 0; connect(); }
        else close();
      })
    : null;

  return () => {
    stopped = true;
    offVisibility?.();
    close();
  };
}

/**
 * Subscribe a method to a Server-Sent Events stream.
 *
 * ```ts
 * @sse("/api/events")
 * onEvent(e: MessageEvent) { this.items.push(JSON.parse(e.data)); }
 * ```
 *
 * `EventSource` reconnects on its own, but only for a clean drop -- an HTTP
 * error closes it for good. The retry here covers that case, which is the one
 * that leaves a page silently stale.
 */
const sseRaw = createDecorator<[url: string | ((el: any) => string), opts?: StreamOptions]>(
  (method, _key, url, opts = {}) => {
    return (el: any) => {
      const ES = (globalThis as { EventSource?: any }).EventSource;
      if (typeof ES !== "function") {
        console.warn("[loom] @sse: EventSource is not available");
        return () => {};
      }
      const target = typeof url === "function" ? url(el) : url;

      return makeStream(
        opts,
        (onMessage, onOpen, onError, onClose) => {
          const es = new ES(target);
          es.onmessage = onMessage;
          es.onopen = onOpen;
          es.onerror = (e: Event) => {
            onError(e);
            // EventSource stays CONNECTING while it retries by itself; only a
            // CLOSED source is ours to reopen.
            if (es.readyState === 2 /* CLOSED */) onClose();
          };
          return { close: () => es.close() };
        },
        (e) => method.call(el, e),
        el,
      );
    };
  },
);

/**
 * Subscribe a method to a WebSocket.
 *
 * ```ts
 * @socket("wss://example.com/feed")
 * onMessage(e: MessageEvent) { ... }
 *
 * @socket((el) => `wss://example.com/room/${el.roomId}`, { retryDelay: 500 })
 * onRoom(e: MessageEvent) { ... }
 * ```
 *
 * The socket is closed on disconnect. Without that, its handlers keep the
 * component and its DOM reachable, and a reconnect timer keeps firing at a
 * host that is no longer in the document.
 */
const socketRaw = createDecorator<
  [url: string | ((el: any) => string), opts?: StreamOptions & { protocols?: string | string[] }]
>((method, _key, url, opts = {}) => {
  return (el: any) => {
    const WS = (globalThis as { WebSocket?: any }).WebSocket;
    if (typeof WS !== "function") {
      console.warn("[loom] @socket: WebSocket is not available");
      return () => {};
    }
    const target = typeof url === "function" ? url(el) : url;

    return makeStream(
      opts,
      (onMessage, onOpen, onError, onClose) => {
        const ws = opts.protocols ? new WS(target, opts.protocols) : new WS(target);
        ws.onmessage = onMessage;
        ws.onopen = onOpen;
        ws.onerror = onError;
        ws.onclose = onClose;
        return {
          close: () => {
            // Drop the handlers before closing: onclose would otherwise fire
            // during teardown and schedule a reconnect for a dead component.
            ws.onmessage = ws.onopen = ws.onerror = ws.onclose = null;
            try { ws.close(); } catch { /* not open yet */ }
          },
        };
      },
      (e) => method.call(el, e),
      el,
    );
  };
});

// ── Typed surface ────────────────────────────────────────────────────────────

/**
 * A decorator that only accepts a handler taking `MessageEvent<T>`.
 *
 * createDecorator types the decorated method as `Function`, so a type
 * parameter written at the call site would be accepted and never checked.
 * Narrowing the returned decorator is what makes `@sse<Price>` mean something.
 */
type MessageDecorator<T> = (
  method: (event: MessageEvent<T>) => void,
  context: ClassMethodDecoratorContext,
) => void;

/**
 * Subscribe a method to a Server-Sent Events stream.
 *
 * ```ts
 * @sse<Price>("/api/prices", { json: true })
 * onTick(e: MessageEvent<Price>) {
 *   this.price = e.data.amount;   // typed, and already parsed
 * }
 * ```
 *
 * `T` defaults to `string`, which is what the transport actually delivers.
 * Declaring a payload type without `json: true` would be a claim about a
 * string, so the two are meant to be used together.
 */
export function sse<T = string>(
  url: string | ((el: any) => string),
  opts?: StreamOptions,
): MessageDecorator<T> {
  return sseRaw(url, opts) as MessageDecorator<T>;
}

/**
 * Subscribe a method to a WebSocket.
 *
 * ```ts
 * @socket<Tick>("wss://example.com/feed", { json: true })
 * onMessage(e: MessageEvent<Tick>) { this.last = e.data; }
 * ```
 */
export function socket<T = string>(
  url: string | ((el: any) => string),
  opts?: StreamOptions & { protocols?: string | string[] },
): MessageDecorator<T> {
  return socketRaw(url, opts) as MessageDecorator<T>;
}
