/**
 * CSS — /element/css
 *
 * The css`` tagged template, @styles decorator, scoped styles model.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementCSS extends LoomElement {
  update() {
    return (
      <div>
        <h1>CSS</h1>
        <p class="subtitle">Scoped styles via tagged template literals, the @styles decorator, and CSSStyleSheet.</p>

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--emerald)"></loom-icon>
            <h2>The css`` Tagged Template</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Loom provides a <span class="ic">css</span> tagged template literal that creates a
              <span class="ic">CSSStyleSheet</span> object. The sheet is parsed once and cached — subsequent
              calls with the same template return the same instance.
            </div>
            <code-block lang="ts" code={`import { css } from "@toyz/loom";

const styles = css\`
  :host { display: block; padding: 16px; }
  .title { font-size: 1.5rem; font-weight: 700; }
  .subtitle { color: #888; }
\`;`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--accent)"></loom-icon>
            <h2>@styles Decorator</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@styles(sheet, ...)</div>
            <div class="dec-desc">
              The recommended way to apply styles. Auto-adopts one or more <span class="ic">CSSStyleSheet</span>s when the element connects.
              No boilerplate needed.
            </div>
            <code-block lang="ts" code={`import { component, styles, css, LoomElement } from "@toyz/loom";

const sheet = css\`
  :host { display: block; }
  .card {
    padding: 16px; border-radius: 8px;
    background: var(--surface-2); border: 1px solid var(--border);
  }
\`;

@component("my-card")
@styles(sheet)
class MyCard extends LoomElement {
  update() {
    return <div class="card"><slot></slot></div>;
  }
}`}></code-block>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Multiple <span class="ic">@styles()</span> calls stack — all sheets are adopted. Useful for composing shared + component-specific styles:
            </div>
            <code-block lang="ts" code={`import { baseStyles } from "../styles/base";
import { buttonStyles } from "../styles/buttons";

@component("my-form")
@styles(baseStyles, buttonStyles, formSheet)
class MyForm extends LoomElement { ... }`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Inline Styles in update()</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              For quick prototyping, call <span class="ic">this.css``</span> inside <span class="ic">update()</span>.
              The sheet is adopted into the shadow root automatically. Since it's cached, there's no
              performance penalty from calling it on every render.
            </div>
            <code-block lang="ts" code={`@component("my-card")
class MyCard extends LoomElement {
  update() {
    this.css\`
      :host { display: block; border-radius: 8px; padding: 16px; }
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
          </div>
          <div class="note">
            <loom-icon name="bolt" size={14} color="var(--amber)"></loom-icon> Prefer <span class="ic">@styles(sheet)</span> for production components — it separates concerns
            and avoids style adoption on every render call.
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--amber)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Step</th><th>What Happens</th></tr></thead>
            <tbody>
              <tr><td>1</td><td><code>css`...`</code> parses the template into a <code>CSSStyleSheet</code></td></tr>
              <tr><td>2</td><td>The sheet is cached by template identity — same template, same sheet</td></tr>
              <tr><td>3</td><td><code>@styles(sheet)</code> adopts it into <code>shadow.adoptedStyleSheets</code> on connect</td></tr>
              <tr><td>4</td><td>Shadow DOM scoping ensures styles don't leak or collide with other components</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="box" size={20} color="var(--rose)"></loom-icon>
            <h2>:host and Scoping</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              All styles are scoped to the component's shadow root. Use <span class="ic">:host</span> to style the
              component's outer element, and <span class="ic">:host(.class)</span> for conditional styling based on
              host attributes or classes.
            </div>
            <code-block lang="ts" code={`const sheet = css\`
  :host { display: flex; gap: 8px; }
  :host([disabled]) { opacity: 0.5; pointer-events: none; }
  :host(.compact) { padding: 4px; }
  ::slotted(p) { margin: 0; }
\`;`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
            <h2>Dynamic Values</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Use CSS custom properties for dynamic values. The template is parsed once, and you
              update custom properties on the host to change styles:
            </div>
            <code-block lang="ts" code={`const sheet = css\`
  :host { border: 2px solid var(--card-accent); }
  .title { color: var(--card-accent); }
\`;

@component("theme-card")
@styles(sheet)
class ThemeCard extends LoomElement {
  @prop accessor accent = "#818cf8";

  update() {
    this.style.setProperty("--card-accent", this.accent);
    return <h2 class="title"><slot></slot></h2>;
  }
}`}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--accent)"></loom-icon>
            <h2>API Reference</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>API</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>css`...`</code></td><td>Tagged template</td><td>Create a cached CSSStyleSheet</td></tr>
              <tr><td><code>@styles(sheet, ...)</code></td><td>Class decorator</td><td>Auto-adopt stylesheets on connect</td></tr>
              <tr><td><code>this.css`...`</code></td><td>Instance method</td><td>Adopt inline styles in update()</td></tr>
              <tr><td><code>this.adoptStyles(sheets)</code></td><td>Instance method</td><td>Programmatic style adoption</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
