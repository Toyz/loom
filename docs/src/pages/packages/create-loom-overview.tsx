/**
 * Packages — Create Loom Overview  /packages/create-loom
 *
 * Scaffolding tool overview, usage, template structure.
 */
import { LoomElement } from "@toyz/loom";

export default class PageCreateLoomOverview extends LoomElement {
  update() {
    return (
      <div>
        <h1>@toyz/create-loom</h1>
        <p class="subtitle">Scaffold a new Loom + TypeScript + Vite project in seconds.</p>

        <section>
          <div class="group-header">
            <loom-icon name="terminal" size={20}></loom-icon>
            <h2>Usage</h2>
          </div>
          <code-block lang="bash" code={`npm create @toyz/loom my-app
cd my-app
npm install
npm run dev`}></code-block>
          <p>
            That's it. No prompts, no config wizard, no JavaScript option — Loom is TypeScript only.
          </p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="signpost" size={20}></loom-icon>
            <h2>Current Directory</h2>
          </div>
          <p>
            To scaffold into the current directory instead of creating a new folder:
          </p>
          <code-block lang="bash" code={`npm create @toyz/loom .`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="archive" size={20}></loom-icon>
            <h2>What You Get</h2>
          </div>
          <code-block lang="text" code={`my-app/
├── index.html            5 lines
├── package.json          1 dep, 2 devDeps
├── tsconfig.json         Loom JSX pre-configured
├── vite.config.ts        esbuild JSX wired to Loom
└── src/
    ├── main.tsx           app.start()
    ├── app.tsx            starter component
    └── global.d.ts        CSS module types`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="package" size={20}></loom-icon>
            <h2>Dependencies</h2>
          </div>
          <table class="api-table">
            <thead><tr><th>Type</th><th>Package</th><th>Why</th></tr></thead>
            <tbody>
              <tr><td><code>dependencies</code></td><td>@toyz/loom</td><td>The framework (zero transitive deps)</td></tr>
              <tr><td><code>devDependencies</code></td><td>typescript</td><td>Type checking</td></tr>
              <tr><td><code>devDependencies</code></td><td>vite</td><td>Dev server + bundler</td></tr>
            </tbody>
          </table>
          <p>No other packages. No plugins. No polyfills.</p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20}></loom-icon>
            <h2>Starter Component</h2>
          </div>
          <p>
            The generated <span class="ic">app.tsx</span> gives you a minimal Loom component
            with reactive state, scoped CSS, and JSX:
          </p>
          <code-block lang="tsx" code={`import { LoomElement, component, reactive, css, styles } from "@toyz/loom";

const appStyles = css\`
  :host { display: block; padding: 2rem; text-align: center; }
  h1 { font-size: 2rem; color: #c084fc; }
  button { padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }
  span { font-weight: bold; margin-left: 0.5rem; }
\`;

@component("my-app")
@styles(appStyles)
export class App extends LoomElement {
  @reactive accessor count = 0;

  update() {
    return (
      \<div\>
        \<h1\>Loom\</h1\>
        \<button onClick={() => this.count++}\>
          Clicks: \<span\>{this.count}\</span\>
        \</button\>
      \</div\>
    );
  }
}`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20}></loom-icon>
            <h2>TSConfig</h2>
          </div>
          <p>
            The generated <span class="ic">tsconfig.json</span> is pre-configured for Loom's
            JSX runtime and TC39 decorators:
          </p>
          <code-block lang="json" code={`{
  "compilerOptions": {
    "target": "es2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "@toyz/loom",
    "strict": true
  },
  "include": ["src"]
}`}></code-block>
        </section>
      </div>
    );
  }
}
