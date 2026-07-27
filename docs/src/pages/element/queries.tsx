/**
 * DOM Queries — /element/queries
 *
 * @query, @queryAll
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementQueries extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="DOM Queries" subtitle="Live shadow-root lookups that cannot go stale, because nothing is cached."></doc-header>

        <section>
          <p>Querying the shadow root by hand goes wrong in two directions. Query too early — in the constructor or <span class="ic">connect</span> — and the template has not rendered, so you get <span class="ic">null</span>. Query once and cache the node, and the reference goes stale the moment a morph replaces that element.</p>
          <p><span class="ic">@query</span> and <span class="ic">@queryAll</span> sidestep both by reading on every access. The accessor is a live lookup, not a stored node, so it is correct after any render and there is nothing to invalidate. The cost is a <span class="ic">querySelector</span> per read, which is why the parameterized form pre-compiles its selector at decoration time rather than building it per call.</p>
          <punch-matrix
            columns="MANY RESULTS,PARAMETERIZED,NULL WHEN ABSENT"
            rows={[
              { name: "@query(selector)", punches: "NULL WHEN ABSENT", note: "First match, read live on every access" },
              { name: `@query("sel-$0")`, punches: "PARAMETERIZED,NULL WHEN ABSENT", note: "Selector compiled at decoration time" },
              { name: "@queryAll(selector)", punches: "MANY RESULTS", note: "An array, empty rather than null" },
              { name: `@queryAll("sel-$0")`, punches: "MANY RESULTS,PARAMETERIZED", note: "Both, together" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="@query">
          <api-entry sig="@query(selector)">
            <p>
              Lazy shadow DOM <span class="ic">querySelector</span>. Returns the first match on access — always reads live DOM.
            </p>
            <code-block lang="ts" code={`@query(".submit-btn") accessor submitBtn!: HTMLButtonElement;
@query("canvas") accessor canvas!: HTMLCanvasElement;

@mount
setup() {
  this.canvas.width = 800;
  this.canvas.height = 600;
  this.submitBtn.addEventListener("click", () => this.save());
}`}></code-block>
          </api-entry>
          <api-entry sig={`@query("selector-$0") — Dynamic (parameterized)`}>
            <p>
              Use <span class="ic">$0</span>, <span class="ic">$1</span>, etc. as placeholders to make the selector dynamic.
              The accessor becomes a callable typed as <span class="ic">LoomHtmlQuery&lt;Args, El&gt;</span>.
              The selector template is pre-compiled at decoration time — no regex at call time.
            </p>
            <code-block lang="ts" code={`import type { LoomHtmlQuery } from "@toyz/loom";

// $0 is replaced by the first argument at call time
@query(".add-input-$0")
accessor inputFor!: LoomHtmlQuery<[string], HTMLInputElement>;

// Usage — returns HTMLInputElement | null
const el = this.inputFor("todo");    // → querySelector(".add-input-todo")
const el2 = this.inputFor("done");   // → querySelector(".add-input-done")

// Multiple placeholders
@query(".cell-$0-$1")
accessor cellAt!: LoomHtmlQuery<[number, number]>;

const cell = this.cellAt(2, 3); // → querySelector(".cell-2-3")`}></code-block>
            <doc-notification type="note">
              Selector templates are split and indexed at <strong>decoration time</strong>, not call time.
              Each call is just array indexing + string concatenation — zero regex overhead at runtime.
            </doc-notification>
          </api-entry>
        </doc-section>
        <doc-section heading="@queryAll">
          <api-entry sig="@queryAll(selector)">
            <p>
              Lazy shadow DOM <span class="ic">querySelectorAll</span>. Returns an array (not NodeList) on each access.
            </p>
            <code-block lang="ts" code={`@queryAll("input") accessor inputs!: HTMLInputElement[];
@queryAll(".swatch") accessor swatches!: HTMLElement[];

validate() {
  const allValid = this.inputs.every(i => i.checkValidity());
  this.swatches.forEach(s => s.classList.toggle("active", false));
}`}></code-block>
          </api-entry>
          <api-entry sig={`@queryAll("selector-$0") — Dynamic`}>
            <p>
              Same placeholder system as <span class="ic">@query</span>, but returns all matches as an array.
              Typed as <span class="ic">LoomHtmlQueryAll&lt;Args, El&gt;</span>.
            </p>
            <code-block lang="ts" code={`import type { LoomHtmlQueryAll } from "@toyz/loom";

@queryAll(".card-$0")
accessor cardsIn!: LoomHtmlQueryAll<[string]>;

// Returns HTMLElement[]
const cards = this.cardsIn("featured"); // → querySelectorAll(".card-featured")`}></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="How They Work">
            <p>
              Both decorators replace the property with a getter that calls{" "}
              <span class="ic">this.shadow.querySelector()</span> or <span class="ic">this.shadow.querySelectorAll()</span>{" "}
              on each access. This means:
            </p>
          <api-table
            head={["Feature", "Behavior"]}
            rows={[
              ["Live", "Always returns the current DOM state, even after morphing"],
              ["No caching", "Each access queries the shadow root fresh"],
              ["Shadow-scoped", "Only searches within the component's shadow DOM"],
              ["Type-safe", "Type annotation on the property is preserved"],
            ]}
          ></api-table>
        </doc-section>
        <doc-section heading="vs Manual Queries">
            <p>The decorators are sugar for a common pattern. They're equivalent to:</p>
            <code-block lang="ts" code={`// Without decorator
get submitBtn() {
  return this.shadow.querySelector(".submit-btn") as HTMLButtonElement;
}

// With decorator — same behavior, less boilerplate
@query(".submit-btn") submitBtn!: HTMLButtonElement;`}></code-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
