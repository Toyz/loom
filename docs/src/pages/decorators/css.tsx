/**
 * Decorators — Dynamic CSS  /decorators/css
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorCSS extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="@css" subtitle="Dynamic scoped styles from a method — reactive, debounced, and automatically cleaned up."></doc-header>

        <section>
          <p>Almost everything that looks like it needs dynamic CSS does not: a custom property set on the host covers colours, sizes and spacing without regenerating a stylesheet. What custom properties cannot do is change structure — a <span class="ic">grid-template</span> computed from a count, a keyframe body, a selector that only exists in one state.</p>
          <p><span class="ic">@dynamicCss</span> is for that remainder. The method returns CSS text, and it is re-evaluated whenever a reactive field it read changes. The cost is a stylesheet rebuild per change, which is why the result is debounced and why a custom property is the better answer whenever one will do.</p>
        </section>

        <doc-section heading="Overview">
          <p>
            <span class="ic">@css</span> turns a method into a reactive stylesheet generator.
            The method returns a CSS string that is adopted into the component's shadow root.
            When any <span class="ic">@reactive</span>, <span class="ic">@store</span>, or <span class="ic">@signal</span> value read during the method changes, the styles are automatically re-evaluated
            and updated in-place via <span class="ic">CSSStyleSheet.replaceSync()</span>.
          </p>
          <code-block lang="ts" code={`import { dynamicCss } from "@toyz/loom";`}></code-block>
        </doc-section>
        <doc-section heading="Basic Usage">
          <code-block lang="ts" code={`import { component, LoomElement, reactive, dynamicCss } from "@toyz/loom";

@component("themed-card")
class ThemedCard extends LoomElement {
  @reactive accessor accent = "#a78bfa";
  @reactive accessor radius = 8;

  @dynamicCss
  dynamicStyles() {
    return \`
      :host { border-radius: \${this.radius}px; }
      .card {
        border: 2px solid \${this.accent};
        padding: 1rem;
        transition: border-color 0.2s;
      }
    \`;
  }

  update() {
    return <div class="card"><slot></slot></div>;
  }
}`}></code-block>
        </doc-section>
        <doc-section heading="How It Works">
          <p>
            On connect, <span class="ic">@css</span> creates a new <span class="ic">CSSStyleSheet</span>,
            evaluates the method, calls <span class="ic">replaceSync()</span> with the result,
            and adopts the sheet into the shadow root. It then subscribes to all reactive
            fields on the component. When any change, re-evaluation is debounced to one
            <span class="ic">replaceSync()</span> per microtask.
          </p>

          <table class="api-table">
            <thead><tr><th>Phase</th><th>What happens</th></tr></thead>
            <tbody>
              <tr><td>Connect</td><td>Create sheet → evaluate method → <span class="ic">replaceSync()</span> → adopt</td></tr>
              <tr><td>Reactive change</td><td>Debounce → re-evaluate → <span class="ic">replaceSync()</span> (in-place, no DOM work)</td></tr>
              <tr><td>Disconnect</td><td>Unsubscribe all → remove sheet from <span class="ic">adoptedStyleSheets</span></td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-section heading="@css vs @styles">
          <table class="api-table">
            <thead><tr><th>Feature</th><th>@styles(css\`...\`)</th><th>@css</th></tr></thead>
              <tbody>
                <tr><td>Type</td><td>Class decorator</td><td>Method decorator</td></tr>
                <tr><td>When</td><td>Static — defined once</td><td>Dynamic — re-evaluates on state change</td></tr>
                <tr><td>Shared</td><td>Same sheet across instances</td><td>Unique sheet per instance</td></tr>
                <tr><td>Use case</td><td>Layout, typography, base styles</td><td>Theme-reactive, state-dependent styles</td></tr>
                <tr><td>Performance</td><td>Best — cached, shared</td><td>Great — debounced replaceSync()</td></tr>
              </tbody>
          </table>

          <p>
            <strong>Best practice:</strong> Use <span class="ic">@styles</span> for static CSS,
            and <span class="ic">@css</span> only for the parts that actually depend on state.
          </p>
            <code-block lang="ts" code={`const baseSheet = css\`
  :host { display: block; }
  .card { padding: 1rem; }
\`;

@component("themed-card")
@styles(baseSheet)          // Static — shared, cached
class ThemedCard extends LoomElement {
  @reactive accessor accent = "#a78bfa";

  @dynamicCss                       // Dynamic — per-instance, reactive
  themeStyles() {
    return \`:host { --accent: \${this.accent}; }\`;
  }
}`}></code-block>
        </doc-section>
        <doc-section heading="Multiple @css Methods">
          <p>
            You can use multiple <span class="ic">@css</span> methods on a single component.
            Each creates its own stylesheet, adopted independently.
          </p>
            <code-block lang="ts" code={`@component("my-el")
class MyEl extends LoomElement {
  @reactive accessor layout = "grid";
  @reactive accessor theme = "dark";

  @dynamicCss layoutCSS() {
    return \`:host { display: \${this.layout}; }\`;
  }

  @dynamicCss themeCSS() {
    return \`:host { color: \${this.theme === "dark" ? "#fff" : "#000"}; }\`;
  }
}`}></code-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
