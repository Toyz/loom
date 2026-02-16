/**
 * CSS — /element/css
 *
 * The css`` tagged template, CSSStyleSheet, scoped styles model.
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";
import { ElementGroup } from "../../groups";

@route("/css", { group: ElementGroup })
@component("page-element-css")
export class PageElementCSS extends LoomElement {
  update() {
    return (
      <div>
        <h1>CSS</h1>
        <p class="subtitle">Scoped styles via tagged template literals and CSSStyleSheet.</p>

        <section>
          <h2>The css\`\` Tagged Template</h2>
          <p>
            Loom provides a <span class="ic">css</span> tagged template literal that creates a
            <span class="ic">CSSStyleSheet</span> object. The sheet is parsed once and cached — subsequent
            calls with the same template return the same instance.
          </p>
          <code-block lang="ts" code={`import { css } from "@toyz/loom";

const styles = css\`
  :host { display: block; padding: 16px; }
  .title { font-size: 1.5rem; font-weight: 700; }
  .subtitle { color: #888; }
\`;`}></code-block>
        </section>

        <section>
          <h2>Inline Styles in update()</h2>
          <p>
            The most common pattern is calling <span class="ic">this.css\`\`</span> inside <span class="ic">update()</span>.
            The sheet is adopted into the shadow root automatically. Since it's cached, there's no
            performance penalty from calling it on every render.
          </p>
          <code-block lang="ts" code={`@component("my-card")
class MyCard extends LoomElement {
  update() {
    this.css\`
      :host {
        display: block;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 16px;
      }
      .title { font-weight: 700; }
    \`;

    return (
      <div>
        <h2 class="title">{this.title}</h2>
        <slot></slot>
      </div>
    );
  }
}`}></code-block>
        </section>

        <section>
          <h2>Shared Stylesheets</h2>
          <p>
            For styles shared across components, create the sheet in a separate module and
            adopt it manually in <span class="ic">@mount</span>:
          </p>
          <code-block lang="ts" code={`// styles/shared.ts
import { css } from "@toyz/loom";

export const sharedStyles = css\`
  .btn { padding: 8px 16px; border-radius: 6px; cursor: pointer; }
  .btn-primary { background: var(--accent); color: #fff; }
\`;`}></code-block>

          <code-block lang="ts" code={`// components/my-form.tsx
import { sharedStyles } from "../styles/shared";

@component("my-form")
class MyForm extends LoomElement {
  @mount
  setup() {
    this.shadow.adoptedStyleSheets = [
      ...this.shadow.adoptedStyleSheets,
      sharedStyles,
    ];
  }
}`}></code-block>
        </section>

        <section>
          <h2>How It Works</h2>
          <table class="api-table">
            <thead><tr><th>Step</th><th>What Happens</th></tr></thead>
            <tbody>
              <tr><td>1</td><td><code>css\`...\`</code> parses the template into a <code>CSSStyleSheet</code></td></tr>
              <tr><td>2</td><td>The sheet is cached by template identity — same template, same sheet</td></tr>
              <tr><td>3</td><td>When called as <code>this.css\`\`</code>, the sheet is adopted into <code>this.shadow.adoptedStyleSheets</code></td></tr>
              <tr><td>4</td><td>Shadow DOM scoping ensures styles don't leak out or collide with other components</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>:host and Scoping</h2>
          <p>
            All styles are scoped to the component's shadow root. Use <span class="ic">:host</span> to style the
            component's outer element, and <span class="ic">:host(.class)</span> for conditional styling based on
            host attributes or classes.
          </p>
          <code-block lang="ts" code={`this.css\`
  :host { display: flex; gap: 8px; }
  :host([disabled]) { opacity: 0.5; pointer-events: none; }
  :host(.compact) { padding: 4px; }
  ::slotted(p) { margin: 0; }
\`;`}></code-block>
        </section>

        <section>
          <h2>Dynamic Values</h2>
          <p>
            Use CSS custom properties for dynamic values. The template is parsed once, and you
            update custom properties on the host to change styles:
          </p>
          <code-block lang="ts" code={`@component("theme-card")
class ThemeCard extends LoomElement {
  @prop accent = "#818cf8";

  update() {
    this.style.setProperty("--card-accent", this.accent);

    this.css\`
      :host { border: 2px solid var(--card-accent); }
      .title { color: var(--card-accent); }
    \`;

    return <h2 class="title"><slot></slot></h2>;
  }
}`}></code-block>
        </section>
      </div>
    );
  }
}
