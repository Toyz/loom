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
        <doc-header title="@rpc — Type-Safe RPC" subtitle="Declarative server calls with @rpc queries and @mutate mutations, powered by MockTransport — no server required."></doc-header>

        <section>
          <p>A working client against a mock transport: queries that cache and revalidate, a mutation that invalidates them, and a stream that keeps pushing. Nothing here talks to a real server, which is the point — the same code runs against one by swapping the transport.</p>
        </section>

        <doc-section heading="Demo">
          <p>
            This component uses <span class="ic">@toyz/loom-rpc</span> with a <span class="ic">MockTransport</span> that simulates network latency.
            Click users to load details, toggle roles with <span class="ic">@mutate</span>,
            and watch the transport log.
          </p>
          <rpc-demo></rpc-demo>
        </doc-section>
        <doc-section heading="What This Shows">
          <ul>
            <li><span class="ic">@rpc(Router, method)</span> — Auto-fetching query decorator with <span class="ic">ApiState</span></li>
            <li><span class="ic">@rpc + fn</span> — Reactive arg extraction that re-fetches when element state changes</li>
            <li><span class="ic">@mutate(Router, method)</span> — Manual <code>.call()</code> with loading/error tracking</li>
            <li><span class="ic">@stream(Router, method)</span> — Server-push events via <code>AsyncIterable</code>, opens on connect</li>
            <li><span class="ic">@onStream("accessor")</span> — Lifecycle-aware callback handler wired to the stream pump</li>
            <li><span class="ic">.match()</span> — Exhaustive pattern matching for loading, ok, and error states</li>
            <li><span class="ic">MockTransport</span> — Drop-in test transport with delay simulation + stream support</li>
            <li><span class="ic">app.use(RpcTransport, ...)</span> — DI-based transport swap, zero component changes</li>
          </ul>
        </doc-section>
        <doc-section heading="Contract">
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
        </doc-section>
        <doc-section heading="Source">
          <source-block file="docs/src/pages/examples/components/rpc-demo.tsx"></source-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
