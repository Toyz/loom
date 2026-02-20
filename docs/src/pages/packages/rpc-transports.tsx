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
        <h1>Transports</h1>
        <p class="subtitle">Pluggable transport layer — swap HTTP, WebSocket, or mock with one DI line.</p>

        <section>
          <h2>RpcTransport</h2>
          <p>
            The abstract base class that all transports implement. Registered via Loom's DI container
            with <span class="ic">app.use(RpcTransport, impl)</span>.
          </p>
          <code-block lang="ts" code={`abstract class RpcTransport {
  abstract call\u003cT\u003e(
    router: string,
    method: string,
    args: any[],
  ): Promise\u003cT\u003e;
}`}></code-block>
        </section>

        <section>
          <h2>HttpTransport</h2>
          <p>
            The built-in transport — <span class="ic">POST</span> JSON to{" "}
            <span class="ic">/rpc/&#123;Router&#125;/&#123;Method&#125;</span>.
          </p>
          <code-block lang="ts" code={`import { RpcTransport, HttpTransport } from "@toyz/loom-rpc";

// Default: POST /rpc/{Router}/{Method}
app.use(RpcTransport, new HttpTransport());

// Custom base URL
app.use(RpcTransport, new HttpTransport("https://api.example.com/rpc"));

// Custom base URL + default headers
app.use(RpcTransport, new HttpTransport("/api/rpc", {
  "Authorization": "Bearer \u003ctoken\u003e",
}));`}></code-block>

          <table class="api-table">
            <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>baseUrl</code></td><td>string</td><td><code>"/rpc"</code></td><td>Base URL for RPC calls</td></tr>
              <tr><td><code>headers</code></td><td>Record&lt;string, string&gt;</td><td><code>{"{}"}</code></td><td>Default headers sent with every request</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Wire Protocol</h2>
          <p>
            <span class="ic">HttpTransport</span> sends a JSON body with an <span class="ic">args</span>{" "}
            array. Any backend that follows this convention works — Go, Rust, Python, Express, Hono,
            Cloudflare Workers.
          </p>
          <code-block lang="text" code={`POST /rpc/{RouterName}/{MethodName}
Content-Type: application/json

Request:  { "args": [arg1, arg2, ...] }
Response: { "data": \u003creturn value\u003e }
Error:    { "error": { "message": "...", "code": "..." } }`}></code-block>
        </section>

        <section>
          <h2>RpcError</h2>
          <p>
            Structured error thrown by transports with additional context about the failed call.
          </p>
          <table class="api-table">
            <thead><tr><th>Property</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>.message</code></td><td>string</td><td>Error message</td></tr>
              <tr><td><code>.status</code></td><td>number | undefined</td><td>HTTP status code (if applicable)</td></tr>
              <tr><td><code>.router</code></td><td>string | undefined</td><td>The router name</td></tr>
              <tr><td><code>.method</code></td><td>string | undefined</td><td>The method name</td></tr>
              <tr><td><code>.code</code></td><td>string | undefined</td><td>Application-specific error code</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Custom Transports</h2>
          <p>
            Extend <span class="ic">RpcTransport</span> to implement WebSocket, gRPC-Web, or any
            protocol. One DI swap and every <span class="ic">@rpc</span> and{" "}
            <span class="ic">@mutate</span> in the app uses the new transport.
          </p>
          <code-block lang="ts" code={`class WsTransport extends RpcTransport {
  private pending = new Map\u003cstring, {
    resolve: (v: any) => void;
    reject: (e: Error) => void;
  }>();

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

  async call\u003cT\u003e(router: string, method: string, args: any[]): Promise\u003cT\u003e {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, router, method, args }));
    });
  }
}

// Swap in — zero component changes
app.use(RpcTransport, new WsTransport(ws));`}></code-block>
        </section>
      </div>
    );
  }
}
