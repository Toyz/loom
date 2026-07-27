/**
 * Decorators — SSE & WebSocket  /decorators/streams
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorStreams extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="SSE &amp; WebSocket"
          subtitle="Long-lived connections that reconnect, and that actually close."
        ></doc-header>

        <section>
          <p>Two decorators for the two things everyone writes by hand around a stream: reconnection with backoff, and closing on disconnect.</p>
          <p>The leak is the quiet one. A WebSocket opened in <span class="ic">connectedCallback</span> keeps its handlers — and therefore the component, and therefore its whole DOM subtree — reachable after the element is gone, while a reconnect timer keeps firing at a detached host. Route between two pages a few times and there are several live sockets, with nothing in the UI to suggest it.</p>
        </section>

        <doc-section heading="@socket">
          <code-block lang="ts" code={SOCKET}></code-block>
          <p>
            The URL can be a function of the host, so it can depend on a prop that arrives with
            the route.
          </p>
        </doc-section>

        <doc-section heading="@sse">
          <code-block lang="ts" code={SSE}></code-block>
          <p class="note">
            <span class="ic">EventSource</span> reconnects on its own, but only after a clean
            drop — an HTTP error closes it for good. The retry here covers that case, which is
            the one that leaves a page silently stale with no indication anything stopped.
          </p>
        </doc-section>

        <doc-section heading="Options">
          <api-table
            head={["Option", "Type", "Default", "Description"]}
            rows={[
              [<code>reconnect</code>, "boolean", <code>true</code>, "Reconnect after a drop"],
              [<code>retryDelay</code>, "number", <code>1000</code>, "First backoff delay in ms"],
              [<code>maxDelay</code>, "number", <code>30000</code>, "Ceiling for the backoff"],
              [<code>pauseWhenHidden</code>, "boolean", <code>true</code>, "Close while the page is hidden, reopen on return"],
              [<code>onOpen</code> as any, "(host) => void", "—", "Called on every open, including reconnects"],
              [<code>onClose</code> as any, "(host) => void", "—", "Called on every close"],
              [<code>onError</code> as any, "(err, host) => void", "logs", "Called on error"],
            ]}
          ></api-table>
          <p class="tip">
            Backoff is exponential and capped. Uncapped, a server down for an hour means the
            first reconnect after it returns is an hour late. A successful open resets it.
          </p>
        </doc-section>

        <doc-section heading="What happens on disconnect">
          <api-table
            head={["Step", "Why"]}
            rows={[
              ["Handlers are cleared first", <>Otherwise <code>onclose</code> fires during teardown and schedules a reconnect for a component that is already gone</>],
              ["The connection is closed", "Its handlers were the last thing keeping the component's DOM reachable"],
              ["Pending retry timers are cancelled", "A timer firing against a detached host is the other half of the leak"],
              ["The visibility listener is removed", "It would otherwise reopen the stream after the component was gone"],
            ]}
          ></api-table>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}

const SOCKET = `import { component, socket, reactive } from "@toyz/loom";

@component("live-prices")
class LivePrices extends LoomElement {
  @reactive accessor price = 0;

  @socket("wss://example.com/prices")
  onTick(e: MessageEvent) {
    this.price = JSON.parse(e.data).price;
  }
}

// Or built from the host, for a URL that depends on a route param:
@socket((el) => \`wss://example.com/room/\${el.roomId}\`, { retryDelay: 500 })
onRoom(e: MessageEvent) { }`;

const SSE = `@sse("/api/events")
onEvent(e: MessageEvent) {
  this.items = [...this.items, JSON.parse(e.data)];
}`;
