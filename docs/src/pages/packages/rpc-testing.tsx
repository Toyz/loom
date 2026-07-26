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
        <doc-header title="Testing" subtitle="MockTransport — drop-in test transport with mocks, delays, and assertions."></doc-header>

        <section>
          <p>Testing against a real server makes tests slow, order-dependent, and prone to failing for reasons unrelated to the code under test. Testing against a hand-stubbed client makes them lie, because the stub drifts from the real signature and nothing checks it.</p>
          <p><span class="ic">MockTransport</span> is the third option: a real client, typed from the same declaration, with the network replaced. Mock a method and the mock has to match the signature — if the server contract changes, the test stops compiling.</p>
        </section>

        <doc-section heading="Setup">
          <p>
            Import <span class="ic">MockTransport</span> from the testing subpath export.
            Register it as the transport and you're ready to test — no server, no network.
          </p>
          <code-block lang="ts" code={`import { MockTransport } from "@toyz/loom-rpc/testing";
import { RpcTransport } from "@toyz/loom-rpc";

const transport = new MockTransport();
app.use(RpcTransport, transport);`}></code-block>
        </doc-section>
        <doc-section heading="Static Mocks">
          <p>
            Return a fixed value for any router/method combination:
          </p>
          <code-block lang="ts" code={`transport.mock(UserRouter, "getUser", {
  id: "1",
  name: "Alice",
  email: "alice@test.dev",
});`}></code-block>
        </doc-section>
        <doc-section heading="Dynamic Mocks">
          <p>
            Pass a function to compute the response based on the call arguments:
          </p>
          <code-block lang="ts" code={`transport.mock(UserRouter, "getUser", (id: string) => ({
  id,
  name: \`User \${id}\`,
  email: \`user\${id}@test.dev\`,
}));

transport.mock(UserRouter, "listUsers", () => [
  { id: "1", name: "Alice" },
  { id: "2", name: "Bob" },
]);`}></code-block>
        </doc-section>
        <doc-section heading="Error Mocks">
          <p>
            Simulate server errors to test error handling paths:
          </p>
          <code-block lang="ts" code={`transport.mockError(
  UserRouter,
  "deleteUser",
  new Error("Forbidden"),
);`}></code-block>
        </doc-section>
        <doc-section heading="Delay Simulation">
          <p>
            Add artificial latency to test loading states and skeleton UI:
          </p>
          <code-block lang="ts" code={`// 500ms delay on getUser
transport.delay(UserRouter, "getUser", 500);

// 200ms on listUsers
transport.delay(UserRouter, "listUsers", 200);`}></code-block>
        </doc-section>
        <doc-section heading="Assertions">
          <p>
            Verify that specific calls were (or were not) made:
          </p>
          <code-block lang="ts" code={`// Assert a call was made with specific args
transport.assertCalled(UserRouter, "getUser", ["1"]);

// Assert a call was NOT made
transport.assertNotCalled(UserRouter, "deleteUser");

// Inspect full call history
console.log(transport.history);
// [{ router: "UserRouter", method: "getUser", args: ["1"] }]`}></code-block>
        </doc-section>
        <doc-section heading="API Reference">
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
        </doc-section>
        <doc-section heading="Full Test Example">
          <code-block lang="ts" code={`import { describe, it, expect } from "vitest";
import { MockTransport } from "@toyz/loom-rpc/testing";

describe("UserProfile", () => {
  const transport = new MockTransport();

  transport
    .mock(UserRouter, "getUser", (id: string) => ({
      id,
      name: "Test User",
      role: "member",
    }))
    .delay(UserRouter, "getUser", 100);

  it("loads user on connect", async () => {
    // ... render component, wait for fetch
    transport.assertCalled(UserRouter, "getUser", ["1"]);
  });

  afterEach(() => transport.reset());
});`}></code-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
