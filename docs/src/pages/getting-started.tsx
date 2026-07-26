/**
 * Getting Started — /guides/getting-started
 *
 * The setup claims here are checked against the real config: tsconfig target,
 * the JSX import source, and esbuild's keepNames. The page previously also
 * defined a local .note rule, which silently shadowed the shared callout
 * style with the pre-overhaul rounded tinted box. The step index now lives
 * in styles/doc-page.ts so this page and Your First App share one.
 */
import { LoomElement } from "@toyz/loom";

export default class PageGettingStarted extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Getting Started"
          subtitle="Two commands if you take the scaffold, four config lines if you do not."
        ></doc-header>

        <section>
          <p>Loom has no runtime dependencies and no build plugin. What it does need is a toolchain configured for two things the language only recently grew: standard decorators, and the <span class="ic">accessor</span> keyword they attach to. Almost every setup problem people hit is one of those two being off.</p>
          <p>The scaffold gets both right and you can stop reading after step one. The manual path is here because it is four lines, and because knowing which four makes the failure modes obvious rather than mysterious.</p>
          <punch-matrix
            columns="TYPESCRIPT,VITE,TESTS,ENTRY FILES"
            rows={[
              { name: "npm create @toyz/loom", punches: "TYPESCRIPT,VITE,TESTS,ENTRY FILES", note: "Everything below, already wired" },
              { name: "manual install", punches: "", note: "You add the four config lines yourself" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="Step 1 — Scaffold a project">
          <code-block lang="bash" code={`npm create @toyz/loom my-app
cd my-app
npm install
npm run dev`}></code-block>
          <p>
            That is the whole setup. The scaffolder writes the TypeScript and Vite config
            described below, a test runner, and a starter component. Everything it generates is
            ordinary config you can read and change — nothing stays hidden behind a CLI
            afterwards.
          </p>
          <doc-notification type="tip">
            If you are adding Loom to a project that already exists, skip to the next section.
            The four settings there are the entire integration.
          </doc-notification>
        </doc-section>

        <doc-section heading="Adding Loom to a project you already have">
          <h3>Step 2 — Install</h3>
          <code-block lang="bash" code={`npm install @toyz/loom`}></code-block>
          <p>
            One package, no dependencies of its own, no peer dependencies. TypeScript
            declarations and the JSX runtime are both included.
          </p>

          <h3>Step 3 — TypeScript</h3>
          <p>
            Two settings. <span class="ic">target</span> must be <span class="ic">es2022</span> or later, and JSX must resolve to Loom's runtime.
          </p>
          <code-block lang="json" caption="tsconfig.json" code={`{
  "compilerOptions": {
    "target": "es2022",
    "jsx": "react-jsx",
    "jsxImportSource": "@toyz/loom"
  }
}`}></code-block>
          <doc-notification type="caution">
            Do not set <span class="ic">experimentalDecorators</span>. Loom uses the TC39
            standard decorators, and that flag switches TypeScript to the older, incompatible
            proposal — the one with parameter decorators and a different call signature.
            Turning it on makes every Loom decorator fail in ways that do not obviously point
            back to this setting. Standard decorators are on by default at <span class="ic">es2022</span>; there is no flag to add.
          </doc-notification>

          <h3>Step 4 — Vite</h3>
          <p>
            esbuild needs to be told the same two things, plus one more.
          </p>
          <code-block lang="ts" caption="vite.config.ts" code={`import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    target: "es2022",
    jsx: "automatic",
    jsxImportSource: "@toyz/loom",
    keepNames: true,
  },
});`}></code-block>
          <doc-notification type="warning">
            <span class="ic">keepNames: true</span> matters in production builds. Minifiers
            rename classes, and Loom falls back to <span class="ic">class.name</span> in two
            places: the element tag when <span class="ic">@component</span> is given no tag,
            and the container key when <span class="ic">@service</span> is given no name. Both
            work in dev and break only in the built bundle. Events and explicit <span class="ic">@inject(Class)</span> lookups are unaffected — those key on the
            constructor itself, not its name.
          </doc-notification>
        </doc-section>

        <doc-section heading="Step 5 — Write a component">
          <code-block lang="tsx" caption="src/my-counter.tsx" code={`import { LoomElement, component, reactive } from "@toyz/loom";

@component("my-counter")
export class MyCounter extends LoomElement {
  @reactive accessor count = 0;

  update() {
    return (
      <div>
        <p>Count: {this.count}</p>
        <button onClick={() => this.count++}>+1</button>
      </div>
    );
  }
}`}></code-block>
          <p>
            <span class="ic">accessor</span> is not decoration. A standard decorator on a plain
            field cannot intercept writes to it, so state Loom has to observe is declared as an
            auto-accessor and the decorator replaces its getter and setter. Leave the keyword
            off and assignments compile fine but never schedule a render — the most common
            first-hour surprise, and the reason it is called out here rather than in a
            reference page.
          </p>
        </doc-section>

        <doc-section heading="Step 6 — Boot it">
          <code-block lang="ts" caption="src/main.ts" code={`import { app } from "@toyz/loom";
import "./my-counter"; // side effect: registers <my-counter>

app.start();`}></code-block>
          <p>
            The import is what registers the element, so it has to be present even though
            nothing reads a binding from it. <span class="ic">app.start()</span> constructs
            registered services and starts the router if one is installed; a page with neither
            still works without it, but calling it is the habit that scales.
          </p>
          <code-block lang="html" caption="index.html" code={`<my-counter></my-counter>
<script type="module" src="/src/main.ts"></script>`}></code-block>
          <doc-notification type="note">
            Components use shadow DOM by default, so their styles are scoped and nothing on the
            page can reach in uninvited. If a leaf component should inherit the page's cascade
            instead, opt out per component — see Light DOM.
          </doc-notification>
        </doc-section>

        <doc-section heading="When it does not work">
          <p>
            Three failures cover nearly everything, and none of them produces an error that
            names its cause.
          </p>
          <table class="api-table">
            <thead>
              <tr>
                <th>Symptom</th>
                <th>Cause</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>State changes but nothing re-renders</td>
                <td>A <code>@reactive</code> field declared without <code>accessor</code></td>
              </tr>
              <tr>
                <td>Decorators throw at class-definition time</td>
                <td><code>experimentalDecorators</code> is on, or <code>target</code> is below <code>es2022</code></td>
              </tr>
              <tr>
                <td>Works in dev, breaks once built</td>
                <td><code>keepNames</code> is off and the minifier renamed a class used as a key</td>
              </tr>
            </tbody>
          </table>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}
