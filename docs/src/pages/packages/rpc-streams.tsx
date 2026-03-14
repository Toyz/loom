/**
 * Packages — @stream / @onStream Streams  /packages/rpc-streams
 *
 * RpcStream, @stream decorator, @onStream handler, eager flag, direct iteration.
 */
import { LoomElement } from "@toyz/loom";

export default class PageRpcStreams extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="@stream — Streams" subtitle="Server-push streams via WebSocket, SSE, or any async transport — decorator-driven and lifecycle-aware."></doc-header>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--accent)"></loom-icon>
            <h2>Overview</h2>
          </div>
          <p>
            <span class="ic">@stream</span> is the push counterpart to{" "}
            <span class="ic">@rpc</span>. Instead of a one-shot request, it opens a
            long-lived connection through the registered{" "}
            <span class="ic">RpcTransport</span> and delivers events as an{" "}
            <span class="ic">AsyncIterable</span>.
          </p>
          <p>
            The transport must implement <span class="ic">stream()</span>{" "}
            (e.g. a WebSocket or SSE transport). <span class="ic">HttpTransport</span>
            {" "}handles regular HTTP calls only.
          </p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Basic Usage — Component</h2>
          </div>
          <p>
            Define a contract method that returns <span class="ic">AsyncIterable&lt;T&gt;</span>,
            then use <span class="ic">@stream</span> + <span class="ic">@onStream</span> to
            wire it into your component. The stream opens automatically on connect and
            closes on disconnect.
          </p>
          <code-block lang="ts" code={`import { stream, onStream } from "@toyz/loom-rpc";
import { ChatRouter } from "../contracts/chat";

@component("chat-feed")
class ChatFeed extends LoomElement {
  @prop() accessor roomId!: string;

  @stream(ChatRouter, "messages", { fn: el => [el.roomId] })
  accessor chatMessages!: RpcStream<ChatMessage>;

  @onStream("chatMessages")
  onMessage(msg: ChatMessage) {
    this.messages.push(msg);
    this.scheduleUpdate();
  }

  update() {
    return (
      <ul>
        {this.messages.map(m => <li>{m.text}</li>)}
      </ul>
    );
  }
}`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Direct Iteration</h2>
          </div>
          <p>
            <span class="ic">RpcStream&lt;T&gt;</span> implements{" "}
            <span class="ic">AsyncIterable&lt;T&gt;</span> directly — ideal for services
            or any non-component context.
          </p>
          <code-block lang="ts" code={`// In a @service — iterate directly, no decorator needed
for await (const msg of this.chatMessages) {
  this.bus.emit(new NewMessageEvent(msg));
}

// .events is an alias for the same iterable
for await (const msg of this.chatMessages.events) { ... }`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
            <h2>@stream Options</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>fn</code></td><td>(el) =&gt; Args</td><td><code>[]</code></td><td>Extract procedure args from element state. Called once when the stream opens.</td></tr>
              <tr><td><code>eager</code></td><td>boolean</td><td><code>true</code></td><td>Auto-open on connect when used with <code>@onStream</code>. Set to <code>false</code> to open manually.</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Manual Control — eager: false</h2>
          </div>
          <p>
            Set <span class="ic">eager: false</span> to control exactly when the stream
            opens (e.g. after a user action). Call <span class="ic">.open()</span> to start
            and <span class="ic">.close()</span> to stop.
          </p>
          <code-block lang="ts" code={`@stream(ChatRouter, "messages", {
  fn:    el => [el.roomId],
  eager: false,            // don't open automatically
})
accessor chatMessages!: RpcStream<ChatMessage>;

@onStream("chatMessages")
onMessage(msg: ChatMessage) { ... }

// Open only when the user joins the room
joinRoom() {
  this.chatMessages.open();
}

// Close when leaving
leaveRoom() {
  this.chatMessages.close();
}`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>RpcStream&lt;T&gt; API</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Member</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>.status</code></td><td><code>"idle" | "streaming" | "error" | "closed"</code></td></tr>
              <tr><td><code>.error</code></td><td>Error if status is <code>"error"</code>, otherwise <code>null</code></td></tr>
              <tr><td><code>.open()</code></td><td>Start the stream pump (no-op if already streaming)</td></tr>
              <tr><td><code>.close()</code></td><td>Stop the stream and release the connection</td></tr>
              <tr><td><code>.events</code></td><td>Named alias for <code>[Symbol.asyncIterator]()</code></td></tr>
              <tr><td><code>[Symbol.asyncIterator]()</code></td><td>Iterate directly with <code>for await</code></td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Transport — Implementing stream()</h2>
          </div>
          <p>
            Extend <span class="ic">RpcTransport</span> and implement the optional{" "}
            <span class="ic">stream()</span> method to return an{" "}
            <span class="ic">AsyncIterable&lt;T&gt;</span>. The framework drives teardown
            via the iterator protocol when <span class="ic">.close()</span> is called.
          </p>
          <code-block lang="ts" code={`import { RpcTransport } from "@toyz/loom-rpc";

class WsTransport extends RpcTransport {
  async call<T>(router, method, args): Promise<T> { ... }

  stream<T>(router: string, method: string, args: any[]): AsyncIterable<T> {
    return {
      [Symbol.asyncIterator]() {
        const ws = new WebSocket(\`wss://api.example.com/stream\`);
        const queue: T[] = [];
        let done = false;
        let resolve: (() => void) | null = null;

        ws.onmessage = e => {
          queue.push(JSON.parse(e.data));
          resolve?.();
        };
        ws.onclose = () => { done = true; resolve?.(); };
        ws.onopen = () => ws.send(JSON.stringify({ router, method, args }));

        return {
          async next() {
            if (queue.length) return { value: queue.shift()!, done: false };
            if (done)         return { value: undefined as any, done: true };
            await new Promise(r => { resolve = () => { resolve = null; r(undefined); }; });
            return queue.length
              ? { value: queue.shift()!, done: false }
              : { value: undefined as any, done: true };
          },
          return() { ws.close(); return Promise.resolve({ value: undefined as any, done: true }); },
        };
      },
    };
  }
}`}></code-block>
        </section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}
