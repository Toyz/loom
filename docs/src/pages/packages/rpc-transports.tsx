/**
 * Packages — RPC Transports  /packages/rpc-transports
 *
 * RpcTransport, HttpTransport, RpcError, custom transports, wire protocol.
 */
import { LoomElement } from "@toyz/loom";

export default class PageRpcTransports extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Transports" subtitle="Pluggable transport layer — swap HTTP, WebSocket, or mock with one DI line."></doc-header>

        <section>
          <p>How a call reaches the server is not the same question as what the call means. Conflating them is what makes an RPC layer impossible to test: the only way to exercise it is to run a server.</p>
          <p>A transport is the seam. The same typed client runs over HTTP in production, over a WebSocket where you need push, and over a mock in tests, with no change at the call site.</p>
          <punch-matrix
            columns="REQUEST AND RESPONSE,SERVER PUSH,NO NETWORK"
            rows={[
              { name: "HttpTransport", punches: "REQUEST AND RESPONSE", note: "Ordinary calls over HTTP" },
              { name: "WebSocket transport", punches: "REQUEST AND RESPONSE,SERVER PUSH", note: "Required for @stream" },
              { name: "MockTransport", punches: "REQUEST AND RESPONSE,NO NETWORK", note: "The real client, typed the same, in tests" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="RpcTransport">
          <p>
            The abstract base class that all transports implement. Registered via Loom's DI container
            with <span class="ic">app.use(RpcTransport, impl)</span>.
          </p>
          <code-block lang="ts" code={`abstract class RpcTransport {
  abstract call\<T\>(
    router: string,
    method: string,
    args: any[],
  ): Promise\<T\>;
}`}></code-block>
        </doc-section>
        <doc-section heading="HttpTransport">
          <p>
            The built-in transport — <span class="ic">POST</span> JSON to <span class="ic">/rpc/&#123;Router&#125;/&#123;Method&#125;</span>.
          </p>
          <code-block lang="ts" code={`import { RpcTransport, HttpTransport } from "@toyz/loom-rpc";

// Default: POST /rpc/{Router}/{Method}
app.use(RpcTransport, new HttpTransport());

// Custom base URL
app.use(RpcTransport, new HttpTransport("https://api.example.com/rpc"));

// Custom base URL + default headers
app.use(RpcTransport, new HttpTransport("/api/rpc", {
  "Authorization": "Bearer <token>",
}));`}></code-block>

          <table class="api-table">
            <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>baseUrl</code></td><td>string</td><td><code>"/rpc"</code></td><td>Base URL for RPC calls</td></tr>
              <tr><td><code>headers</code></td><td>Record&lt;string, string&gt;</td><td><code>{"{}"}</code></td><td>Default headers sent with every request</td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-section heading="Wire Protocol">
          <p>
            <span class="ic">HttpTransport</span> sends a JSON body with an <span class="ic">args</span> array. Any backend that follows this convention works — Go, Rust, Python, Express, Hono,
            Cloudflare Workers.
          </p>
          <code-block lang="text" code={`POST /rpc/{RouterName}/{MethodName}
Content-Type: application/json

Request:  { "args": [arg1, arg2, ...] }
Response: { "data": \<return value\> }
Error:    { "error": { "message": "...", "code": "..." } }`}></code-block>
        </doc-section>
        <doc-section heading="RpcError">
          <p>
            Structured error thrown by transports with additional context about the failed call.
          </p>
          <api-table
            head={["Property", "Type", "Description"]}
            rows={[
              [<code>.message</code>, "string", "Error message"],
              [<code>.status</code>, "number | undefined", "HTTP status code (if applicable)"],
              [<code>.router</code>, "string | undefined", "The router name"],
              [<code>.method</code>, "string | undefined", "The method name"],
              [<code>.code</code>, "string | undefined", "Application-specific error code"],
            ]}
          ></api-table>
        </doc-section>
        <doc-section heading="Custom Transports">
          <p>
            Extend <span class="ic">RpcTransport</span> to implement WebSocket, gRPC-Web, or any
            protocol. One DI swap and every <span class="ic">@rpc</span> and <span class="ic">@mutate</span> in the app uses the new transport.
          </p>
          <code-block lang="ts" code={`class WsTransport extends RpcTransport {
  private pending = new Map\<string, {
    resolve: (v: any) => void;
    reject: (e: Error) => void;
  }\>();

  constructor(private ws: WebSocket) {
    super();
    ws.addEventListener("message", (e) => {
      const { id, data, error } = JSON.parse(e.data);
      const p = this.pending.get(id);
      if (!p) return;
      this.pending.delete(id);
      error ? p.reject(new Error(error.message)) : p.resolve(data);
    });
  }

  async call\<T\>(router: string, method: string, args: any[]): Promise\<T\> {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, router, method, args }));
    });
  }
}

// Swap in — zero component changes
app.use(RpcTransport, new WsTransport(ws));`}></code-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
