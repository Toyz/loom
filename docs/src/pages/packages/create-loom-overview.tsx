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
        <doc-header title="@toyz/create-loom" subtitle="Scaffold a new Loom + TypeScript + Vite project in seconds."></doc-header>

        <section>
          <p>Getting decorators, JSX and TypeScript configured together is the least interesting part of starting a project and the easiest to get subtly wrong — stage-3 versus legacy decorators, the JSX import source, and the <span class="ic">accessor</span> keyword all have to agree.</p>
          <p>The scaffolder emits a project where they already do. Everything it generates is ordinary configuration you can read and change; there is nothing hidden behind a CLI afterwards.</p>
        </section>

        <doc-section heading="Usage">
          <code-block lang="bash" code={`npm create @toyz/loom my-app
cd my-app
npm install
npm run dev`}></code-block>
          <p>
            That's it. No prompts, no config wizard, no JavaScript option — Loom is TypeScript only.
          </p>
        </doc-section>
        <doc-section heading="Current Directory">
          <p>
            To scaffold into the current directory instead of creating a new folder:
          </p>
          <code-block lang="bash" code={`npm create @toyz/loom .`}></code-block>
        </doc-section>
        <doc-section heading="What You Get">
          <code-block lang="text" code={`my-app/
├── index.html            mounts <my-app>
├── package.json          1 dep, 3 devDeps
├── tsconfig.json         Loom JSX pre-configured
├── vite.config.ts        esbuild JSX wired to Loom
├── vitest.config.ts      happy-dom, same JSX settings
├── vitest.setup.ts       app.start(), so tags are defined in tests
├── .gitignore
├── README.md
└── src/
    ├── main.tsx           app.start()
    ├── app.tsx            starter component
    └── app.test.tsx       its test`}></code-block>
        </doc-section>
        <doc-section heading="Dependencies">
          <api-table
            head={["Type", "Package", "Why"]}
            rows={[
              [<code>dependencies</code>, "@toyz/loom", "The framework (zero transitive deps)"],
              [<code>devDependencies</code>, "typescript", "Type checking"],
              [<code>devDependencies</code>, "vite", "Dev server + bundler"],
              [<code>devDependencies</code>, "vitest", "Test runner"],
              [<code>devDependencies</code>, "happy-dom", "A DOM for tests -- components are real custom elements"],
            ]}
          ></api-table>
          <p>No plugins. No polyfills.</p>
          <p class="note">
            <span class="ic">vitest.setup.ts</span> calls{" "}
            <span class="ic">app.start()</span> before each test file.{" "}
            <span class="ic">@component</span> only queues a tag; start is what
            calls <span class="ic">customElements.define</span>. Without it a test
            mounts an element the browser never upgrades, which renders nothing
            and fails in a way that looks like a bug in the component.
          </p>
        </doc-section>
        <doc-section heading="Starter Component">
          <p>
            The generated <span class="ic">app.tsx</span> is a minimal component with
            reactive state, a derived value, and scoped CSS:
          </p>
          <code-block lang="tsx" code={STARTER}></code-block>
          <p>
            And <span class="ic">app.test.tsx</span> beside it, so there is something to copy
            rather than a blank file:
          </p>
          <code-block lang="tsx" code={STARTER_TEST}></code-block>
        </doc-section>
        <doc-section heading="TSConfig">
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
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}

const STARTER = `import { LoomElement, component, reactive, computed, css, styles } from "@toyz/loom";

const appStyles = css\`
  :host { display: grid; place-content: center; gap: 1rem; min-height: 100vh; }
  h1 { margin: 0; font-size: 2.5rem; font-weight: 300; }
  button { padding: 0.6rem 1.4rem; border: 1px solid currentColor; border-radius: 6px; }
  .count { font-variant-numeric: tabular-nums; font-weight: 600; }
\`;

@component("my-app")
@styles(appStyles)
export class MyApp extends LoomElement {
  /** Writing to this re-renders. No setState, no dependency array. */
  @reactive accessor count = 0;

  /** Recomputed only when count changes. */
  @computed get parity() {
    return this.count % 2 === 0 ? "even" : "odd";
  }

  update() {
    return (
      <div>
        <h1>Loom</h1>
        <button onClick={() => this.count++}>
          Clicked <span class="count">{this.count}</span> times
        </button>
        <p>That is {this.parity}.</p>
      </div>
    );
  }
}`;

const STARTER_TEST = `import { describe, it, expect, afterEach } from "vitest";
import { fixture, cleanup } from "@toyz/loom/testing";
import type { MyApp } from "./app";

afterEach(() => cleanup());

describe("my-app", () => {
  it("counts clicks", async () => {
    const el = await fixture<MyApp>("my-app");

    el.shadowRoot?.querySelector("button")?.click();
    await el.updateComplete;

    expect(el.count).toBe(1);
    expect(el.shadowRoot?.querySelector(".count")?.textContent).toBe("1");
  });
});`;
