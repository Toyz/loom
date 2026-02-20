/**
 * Packages — RPC Testing  /packages/rpc-testing
 *
 * MockTransport, static/dynamic mocks, assertions, delay simulation.
 */
import { LoomElement } from "@toyz/loom";

export default class PageRpcTesting extends LoomElement {
  update() {
    return (
      <div>
        <h1>Testing</h1>
        <p class="subtitle">MockTransport — drop-in test transport with mocks, delays, and assertions.</p>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
            <h2>Setup</h2>
          </div>
          <p>
            Import <span class="ic">MockTransport</span> from the testing subpath export.
            Register it as the transport and you're ready to test — no server, no network.
          </p>
          <code-block lang="ts" code={`import { MockTransport } from "@toyz/loom-rpc/testing";
import { RpcTransport } from "@toyz/loom-rpc";

const transport = new MockTransport();
app.use(RpcTransport, transport);`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Static Mocks</h2>
          </div>
          <p>
            Return a fixed value for any router/method combination:
          </p>
          <code-block lang="ts" code={`transport.mock("UserRouter", "getUser", {
  id: "1",
  name: "Alice",
  email: "alice@test.dev",
});`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="bolt" size={20} color="var(--amber)"></loom-icon>
            <h2>Dynamic Mocks</h2>
          </div>
          <p>
            Pass a function to compute the response based on the call arguments:
          </p>
          <code-block lang="ts" code={`transport.mock("UserRouter", "getUser", (id: string) => ({
  id,
  name: \`User \${id}\`,
  email: \`user\${id}@test.dev\`,
}));

transport.mock("UserRouter", "listUsers", () => [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
]);`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="alert-triangle" size={20} color="var(--rose)"></loom-icon>
            <h2>Error Mocks</h2>
          </div>
          <p>
            Simulate server errors to test error handling paths:
          </p>
          <code-block lang="ts" code={`transport.mockError(
  "UserRouter",
  "deleteUser",
  new Error("Forbidden"),
);`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="clock" size={20} color="var(--amber)"></loom-icon>
            <h2>Delay Simulation</h2>
          </div>
          <p>
            Add artificial latency to test loading states and skeleton UI:
          </p>
          <code-block lang="ts" code={`// 500ms delay on getUser
transport.delay("UserRouter", "getUser", 500);

// 200ms on listUsers
transport.delay("UserRouter", "listUsers", 200);`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="check-circle" size={20} color="var(--emerald)"></loom-icon>
            <h2>Assertions</h2>
          </div>
          <p>
            Verify that specific calls were (or were not) made:
          </p>
          <code-block lang="ts" code={`// Assert a call was made with specific args
transport.assertCalled("UserRouter", "getUser", ["1"]);

// Assert a call was NOT made
transport.assertNotCalled("UserRouter", "deleteUser");

// Inspect full call history
console.log(transport.history);
// [{ router: "UserRouter", method: "getUser", args: ["1"] }]`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--accent)"></loom-icon>
            <h2>API Reference</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Method</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>.mock(router, method, responseOrFn)</code></td><td>Register a static value or dynamic function mock</td></tr>
              <tr><td><code>.mockError(router, method, error)</code></td><td>Register an error mock</td></tr>
              <tr><td><code>.delay(router, method, ms)</code></td><td>Add artificial latency to a call</td></tr>
              <tr><td><code>.assertCalled(router, method, args?)</code></td><td>Assert a call was made (optionally with specific args)</td></tr>
              <tr><td><code>.assertNotCalled(router, method)</code></td><td>Assert a call was NOT made</td></tr>
              <tr><td><code>.history</code></td><td>Array of all calls: <code>{"{ router, method, args }[]"}</code></td></tr>
              <tr><td><code>.reset()</code></td><td>Clear all mocks, errors, delays, and history</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Full Test Example</h2>
          </div>
          <code-block lang="ts" code={`import { describe, it, expect } from "vitest";
import { MockTransport } from "@toyz/loom-rpc/testing";

describe("UserProfile", () => {
  const transport = new MockTransport();

  transport
    .mock("UserRouter", "getUser", (id: string) => ({
      id,
      name: "Test User",
      role: "member",
    }))
    .delay("UserRouter", "getUser", 100);

  it("loads user on connect", async () => {
    // ... render component, wait for fetch
    transport.assertCalled("UserRouter", "getUser", ["1"]);
  });

  afterEach(() => transport.reset());
});`}></code-block>
        </section>
      </div>
    );
  }
}
