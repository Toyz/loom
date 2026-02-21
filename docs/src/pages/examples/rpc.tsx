/**
 * Example — @rpc / @mutate (LoomRPC)
 *
 * Live demo: @rpc queries, @mutate mutations, MockTransport, SWR cache
 */
import { LoomElement } from "@toyz/loom";
import "./components/rpc-demo";

export default class ExampleRpc extends LoomElement {
  update() {
    return (
      <div>
        <h1>@rpc — Type-Safe RPC</h1>
        <p class="subtitle">
          Declarative server calls with <span class="ic">@rpc</span> queries and{" "}
          <span class="ic">@mutate</span> mutations, powered by{" "}
          <span class="ic">MockTransport</span> — no server required.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Demo</h2>
          </div>
          <p>
            This component uses <span class="ic">@toyz/loom-rpc</span> with a{" "}
            <span class="ic">MockTransport</span> that simulates network latency.
            Click users to load details, toggle roles with <span class="ic">@mutate</span>,
            and watch the transport log.
          </p>
          <rpc-demo></rpc-demo>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--accent)"></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">@rpc(Router, method)</span> — Auto-fetching query decorator with <span class="ic">ApiState</span></li>
            <li><span class="ic">@rpc + fn</span> — Reactive arg extraction that re-fetches when element state changes</li>
            <li><span class="ic">@mutate(Router, method)</span> — Manual <code>.call()</code> with loading/error tracking</li>
            <li><span class="ic">.match()</span> — Exhaustive pattern matching for loading, ok, and error states</li>
            <li><span class="ic">MockTransport</span> — Drop-in test transport with delay simulation</li>
            <li><span class="ic">app.use(RpcTransport, ...)</span> — DI-based transport swap, zero component changes</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="clipboard" size={20} color="var(--accent)"></loom-icon>
            <h2>Contract</h2>
          </div>
          <code-block lang="ts" code={`interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
}

@service("UserService")
class UserRouter {
  getUser(id: string): User { return null!; }
  listUsers(): User[] { return null!; }
  updateRole(id: string, role: "admin" | "member"): User { return null!; }
}`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/rpc-demo.tsx"></source-block>
        </section>
      </div>
    );
  }
}
