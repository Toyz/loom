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
        <h1>DOM Queries</h1>
        <p class="subtitle">Lazy shadow DOM selectors via decorators.</p>

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
            <code-block lang="ts" code={`@query(".submit-btn") submitBtn!: HTMLButtonElement;
@query("canvas") canvas!: HTMLCanvasElement;

@mount
setup() {
  this.canvas.width = 800;
  this.canvas.height = 600;
  this.submitBtn.addEventListener("click", () => this.save());
}`}></code-block>
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
            <code-block lang="ts" code={`@queryAll("input") inputs!: HTMLInputElement[];
@queryAll(".swatch") swatches!: HTMLElement[];

validate() {
  const allValid = this.inputs.every(i => i.checkValidity());
  this.swatches.forEach(s => s.classList.toggle("active", false));
}`}></code-block>
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
      </div>
    );
  }
}
