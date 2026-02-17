/**
 * Testing — /guides/testing
 *
 * fixture(), fixtureHTML(), cleanup(), nextRender()
 */
import { LoomElement } from "@toyz/loom";

export default class PageTesting extends LoomElement {
  update() {
    return (
      <div>
        <h1>Testing</h1>
        <p class="subtitle">
          Harness utilities for testing Loom components with Vitest and
          happy-dom.
        </p>

        <section>
          <h2>Setup</h2>
          <p>
            Loom ships a test harness at{" "}
            <span class="ic">@toyz/loom/testing</span>. It works with Vitest
            and happy-dom to mount, render, interact with, and tear down
            components in isolation.
          </p>
          <code-block
            lang="ts"
            code={`import { fixture, cleanup, nextRender } from "@toyz/loom/testing";
import { afterEach } from "vitest";

afterEach(() => cleanup());`}
          ></code-block>
          <p>
            Call <span class="ic">cleanup()</span> in{" "}
            <span class="ic">afterEach</span> to remove all mounted components
            and prevent DOM leakage between tests.
          </p>
        </section>

        <section>
          <h2>fixture&lt;T&gt;(tag, attrs?)</h2>
          <p>
            Mount a registered component by tag name. Returns the element after
            its first render completes (microtask-flushed). The generic{" "}
            <span class="ic">T</span> types the returned element — no{" "}
            <span class="ic">as any</span> needed.
          </p>
          <code-block
            lang="ts"
            code={`const el = await fixture<MyCounter>("my-counter", { count: "5" });

expect(el.count).toBe(5);
expect(el.shadow.textContent).toContain("5");`}
          ></code-block>

          <h3>Signature</h3>
          <code-block
            lang="ts"
            code={`async function fixture<T extends HTMLElement = LoomElement>(
  tag: string,
  attrs?: Record<string, string>,
): Promise<Rendered<T>>`}
          ></code-block>
          <p>
            <span class="ic">Rendered&lt;T&gt;</span> is{" "}
            <span class="ic">
              T &amp; {"{"} shadow: ShadowRoot {"}"}
            </span>{" "}
            — guarantees <span class="ic">.shadow</span> access for DOM
            assertions.
          </p>
        </section>

        <section>
          <h2>fixtureHTML&lt;T&gt;(html)</h2>
          <p>
            Mount a component from raw HTML. Useful for testing slot content,
            nested components, or complex attribute combinations.
          </p>
          <code-block
            lang="ts"
            code={`const el = await fixtureHTML<MyCard>(\`
  <my-card title="Hello">
    <span slot="footer">© 2025</span>
  </my-card>
\`);

expect(el.shadow.querySelector("slot[name=footer]")).toBeTruthy();`}
          ></code-block>
        </section>

        <section>
          <h2>cleanup()</h2>
          <p>
            Removes all containers created by <span class="ic">fixture()</span>{" "}
            / <span class="ic">fixtureHTML()</span>. Triggers{" "}
            <span class="ic">disconnectedCallback</span> on every mounted
            element, running all <span class="ic">track()</span> cleanups.
          </p>
          <code-block
            lang="ts"
            code={`afterEach(() => cleanup());

// Or call manually in a test:
cleanup(); // all fixtures removed, disconnectedCallback fired`}
          ></code-block>
        </section>

        <section>
          <h2>nextRender(el)</h2>
          <p>
            Wait for the next scheduled update to complete. Returns a promise
            that resolves after the component's{" "}
            <span class="ic">scheduleUpdate()</span> microtask fires.
          </p>
          <code-block
            lang="ts"
            code={`const el = await fixture<MyToggle>("my-toggle");

el.active = true;              // trigger @reactive setter
await nextRender(el);          // wait for re-render

expect(el.shadow.querySelector(".active")).toBeTruthy();`}
          ></code-block>
        </section>

        <section>
          <h2>Full Example</h2>
          <p>
            A complete test file demonstrating the typical pattern.
          </p>
          <code-block
            lang="ts"
            code={`import { describe, it, expect, afterEach } from "vitest";
import { fixture, cleanup, nextRender } from "@toyz/loom/testing";
import { LoomElement, component, reactive } from "@toyz/loom";

@component("test-counter")
class TestCounter extends LoomElement {
  @reactive accessor count = 0;
  update() {
    return <div class="count">{this.count}</div>;
  }
}

describe("TestCounter", () => {
  afterEach(() => cleanup());

  it("renders initial count", async () => {
    const el = await fixture<TestCounter>("test-counter");
    expect(el.shadow.querySelector(".count")?.textContent).toBe("0");
  });

  it("re-renders on count change", async () => {
    const el = await fixture<TestCounter>("test-counter");
    el.count = 42;
    await nextRender(el);
    expect(el.shadow.querySelector(".count")?.textContent).toBe("42");
  });
});`}
          ></code-block>
        </section>

        <section>
          <h2>API Reference</h2>
          <table class="api-table">
            <thead>
              <tr>
                <th>Function</th>
                <th>Returns</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>fixture(tag, attrs?)</code>
                </td>
                <td>
                  <code>Promise&lt;Rendered&lt;T&gt;&gt;</code>
                </td>
                <td>Mount by tag, flush first render</td>
              </tr>
              <tr>
                <td>
                  <code>fixtureHTML(html)</code>
                </td>
                <td>
                  <code>Promise&lt;Rendered&lt;T&gt;&gt;</code>
                </td>
                <td>Mount from HTML string</td>
              </tr>
              <tr>
                <td>
                  <code>cleanup()</code>
                </td>
                <td>
                  <code>void</code>
                </td>
                <td>Remove all fixtures, fire disconnects</td>
              </tr>
              <tr>
                <td>
                  <code>nextRender(el)</code>
                </td>
                <td>
                  <code>Promise&lt;void&gt;</code>
                </td>
                <td>Wait for next scheduled update</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
