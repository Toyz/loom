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
          <h2>Demo</h2>
          <p>
            This component uses <span class="ic">@toyz/loom-rpc</span> with a{" "}
            <span class="ic">MockTransport</span> that simulates network latency.
            Click users to load details, toggle roles with <span class="ic">@mutate</span>,
            and watch the transport log.
          </p>
          <rpc-demo></rpc-demo>
        </section>

        <section>
          <h2>What This Shows</h2>
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
          <h2>Contract</h2>
          <source-block file="docs/src/pages/examples/components/rpc-demo.tsx" start={22} end={34}></source-block>
        </section>

        <section>
          <h2>Source</h2>
          <source-block file="docs/src/pages/examples/components/rpc-demo.tsx"></source-block>
        </section>
      </div>
    );
  }
}
