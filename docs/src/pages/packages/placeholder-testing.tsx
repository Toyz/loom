/**
 * Packages — Placeholder Testing  /packages/placeholder-testing
 *
 * MockPlaceholder testing utilities.
 */
import { LoomElement } from "@toyz/loom";

export default class PagePlaceholderTesting extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Placeholder Testing" subtitle="MockPlaceholder — drop-in test provider with assertions."></doc-header>

        <section>
          <p>A placeholder that reaches the network is a test that fails when the network does, and a snapshot that changes when a remote service does.</p>
          <p><span class="ic">MockPlaceholder</span> resolves locally and deterministically, so the assertion is about your layout rather than about someone else's uptime.</p>
        </section>

        <doc-section heading="Import">
          <code-block lang="ts" code={`import { MockPlaceholder } from "@toyz/loom-placeholder/testing";`}></code-block>
        </doc-section>
        <doc-section heading="Setup">
          <code-block lang="ts" code={`import { app } from "@toyz/loom";
import { PlaceholderProvider } from "@toyz/loom-placeholder";
import { MockPlaceholder } from "@toyz/loom-placeholder/testing";

const mock = new MockPlaceholder();
app.use(PlaceholderProvider, mock);

beforeEach(() => mock.reset());`}></code-block>
        </doc-section>
        <doc-section heading="Assertions">
          <code-block lang="ts" code={`// Returns predictable URLs
const url = mock.url({ width: 300, height: 200 });
// → "mock://300x200"

// Assert call count
mock.assertCalled(1);

// Assert specific options were used
mock.assertCalledWith({ width: 300 });
mock.assertCalledWith({ height: 200 });

// Access raw call records
expect(mock.calls).toHaveLength(1);
expect(mock.calls[0]).toEqual({ width: 300, height: 200 });

// Reset between tests
mock.reset();`}></code-block>
        </doc-section>
        <doc-section heading="API">
          <table class="api-table">
            <thead>
              <tr><th>Method</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><span class="ic">url(options)</span></td><td>Returns <span class="ic">mock://WxH</span> and records the call</td></tr>
              <tr><td><span class="ic">assertCalled(n)</span></td><td>Throws if call count ≠ n</td></tr>
              <tr><td><span class="ic">assertCalledWith(partial)</span></td><td>Throws if no call matches the partial options</td></tr>
              <tr><td><span class="ic">reset()</span></td><td>Clears all recorded calls</td></tr>
              <tr><td><span class="ic">calls</span></td><td>Array of all recorded PlaceholderOptions</td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
