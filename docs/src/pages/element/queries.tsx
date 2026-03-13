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
        <doc-header title="DOM Queries" subtitle="Lazy shadow DOM selectors via decorators."></doc-header>

        <section>
          <div class="group-header">
            <loom-icon name="search" size={20} color="var(--emerald)"></loom-icon>
            <h2>@query</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@query(selector)</div>
            <div class="dec-desc">
              Lazy shadow DOM <span class="ic">querySelector</span>. Returns the first match on access — always reads live DOM.
            </div>
            <code-block lang="ts" code={`@query(".submit-btn") accessor submitBtn!: HTMLButtonElement;
@query("canvas") accessor canvas!: HTMLCanvasElement;

@mount
setup() {
  this.canvas.width = 800;
  this.canvas.height = 600;
  this.submitBtn.addEventListener("click", () => this.save());
}`}></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">@query("selector-$0") — Dynamic (parameterized)</div>
            <div class="dec-desc">
              Use <span class="ic">$0</span>, <span class="ic">$1</span>, etc. as placeholders to make the selector dynamic.
              The accessor becomes a callable typed as <span class="ic">LoomHtmlQuery&lt;Args, El&gt;</span>.
              The selector template is pre-compiled at decoration time — no regex at call time.
            </div>
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
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--accent)"></loom-icon>
            <h2>@queryAll</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@queryAll(selector)</div>
            <div class="dec-desc">
              Lazy shadow DOM <span class="ic">querySelectorAll</span>. Returns an array (not NodeList) on each access.
            </div>
            <code-block lang="ts" code={`@queryAll("input") accessor inputs!: HTMLInputElement[];
@queryAll(".swatch") accessor swatches!: HTMLElement[];

validate() {
  const allValid = this.inputs.every(i => i.checkValidity());
  this.swatches.forEach(s => s.classList.toggle("active", false));
}`}></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">@queryAll("selector-$0") — Dynamic</div>
            <div class="dec-desc">
              Same placeholder system as <span class="ic">@query</span>, but returns all matches as an array.
              Typed as <span class="ic">LoomHtmlQueryAll&lt;Args, El&gt;</span>.
            </div>
            <code-block lang="ts" code={`import type { LoomHtmlQueryAll } from "@toyz/loom";

@queryAll(".card-$0")
accessor cardsIn!: LoomHtmlQueryAll<[string]>;

// Returns HTMLElement[]
const cards = this.cardsIn("featured"); // → querySelectorAll(".card-featured")`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--cyan)"></loom-icon>
            <h2>How They Work</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Both decorators replace the property with a getter that calls
              <span class="ic">this.shadow.querySelector()</span> or <span class="ic">this.shadow.querySelectorAll()</span>
              on each access. This means:
            </div>
          </div>
          <table class="api-table">
            <thead><tr><th>Feature</th><th>Behavior</th></tr></thead>
            <tbody>
              <tr><td>Live</td><td>Always returns the current DOM state, even after morphing</td></tr>
              <tr><td>No caching</td><td>Each access queries the shadow root fresh</td></tr>
              <tr><td>Shadow-scoped</td><td>Only searches within the component's shadow DOM</td></tr>
              <tr><td>Type-safe</td><td>Type annotation on the property is preserved</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--amber)"></loom-icon>
            <h2>vs Manual Queries</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">The decorators are sugar for a common pattern. They're equivalent to:</div>
            <code-block lang="ts" code={`// Without decorator
get submitBtn() {
  return this.shadow.querySelector(".submit-btn") as HTMLButtonElement;
}

// With decorator — same behavior, less boilerplate
@query(".submit-btn") submitBtn!: HTMLButtonElement;`}></code-block>
          </div>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
