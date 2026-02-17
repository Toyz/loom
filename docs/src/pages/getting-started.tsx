/**
 * Getting Started — /guides/getting-started
 */
import { LoomElement } from "@toyz/loom";

export default class PageGettingStarted extends LoomElement {
  update() {
    this.css`
      .step {
        margin-bottom: var(--space-10);
      }

      .step-header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-4);
      }

      .step-num {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--accent-glow);
        border: 1px solid var(--accent-dim);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: var(--text-xs);
        font-weight: 700;
        font-family: var(--font-mono);
        color: var(--accent);
        flex-shrink: 0;
      }

      .note {
        background: var(--accent-glow);
        border: 1px solid var(--accent-dim);
        border-radius: var(--radius-md);
        padding: var(--space-4) var(--space-5);
        font-size: var(--text-sm);
        color: var(--text-secondary);
        margin-top: var(--space-4);
      }
      .note strong { color: var(--accent); }
    `;

    return (
      <div>
        <h1>Getting Started</h1>
        <p class="subtitle">From zero to your first Loom component in under 2 minutes.</p>

        <div class="step">
          <div class="step-header">
            <div class="step-num">1</div>
            <h2>Install</h2>
          </div>
          <code-block lang="bash" code={`npm install @toyz/loom`}></code-block>
          <p>Loom has zero dependencies. The package includes TypeScript declarations and a JSX runtime.</p>
        </div>

        <div class="step">
          <div class="step-header">
            <div class="step-num">2</div>
            <h2>Configure TypeScript</h2>
          </div>
          <p>Add JSX and decorator support to your <span class="ic">tsconfig.json</span>:</p>
          <code-block lang="json" code={`{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@toyz/loom"
  }
}`}></code-block>
        </div>

        <div class="step">
          <div class="step-header">
            <div class="step-num">3</div>
            <h2>Create a Component</h2>
          </div>
          <code-block lang="ts" code={`import { LoomElement, component, reactive } from "@toyz/loom";

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
        </div>

        <div class="step">
          <div class="step-header">
            <div class="step-num">4</div>
            <h2>Boot the App</h2>
          </div>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";
import "./my-counter"; // side-effect: registers the component

app.start();`}></code-block>
          <p>Then use it in your HTML:</p>
          <code-block lang="html" code={`<my-counter></my-counter>`}></code-block>
          <div class="note">
            <strong>Note:</strong> Components use Shadow DOM by default. Styles are scoped — no leaking, no conflicts.
          </div>
        </div>

        <div class="step">
          <div class="step-header">
            <div class="step-num">5</div>
            <h2>Scripts</h2>
          </div>
          <p>Loom ships with test and build scripts out of the box:</p>
          <code-block lang="bash" code={`npm test          # Run tests (Vitest)
npm run build     # TypeScript → dist/
npm run clean     # Remove dist/`}></code-block>
          <div class="note">
            <strong>Tip:</strong> Tests also run automatically before <span class="ic">npm publish</span> via the
            <span class="ic">prepublishOnly</span> hook.
          </div>
        </div>
      </div>
    );
  }
}
