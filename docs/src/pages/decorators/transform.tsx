/**
 * Transform — /decorators/transform
 *
 * @lazy loaded — registered in main.tsx
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorTransform extends LoomElement {
  update() {
    return (
      <div>
        <h1>Transform</h1>
        <p class="subtitle">Value transformation decorators for parsing and conversion.</p>

        {/* ═══════════ @transform ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="refresh" size={20} color="var(--emerald)"></loom-icon>
            <h2>@transform</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@transform(fn: (value: any) =&gt; T)</div>
            <div class="dec-desc">
              Pipe a value through a conversion function before it reaches the property.
              Commonly paired with <span class="ic">@prop</span> for route params or attribute parsing.
            </div>
            <code-block lang="ts" code={`// Single param conversion
@prop({ param: "id" })
@transform(Number)      // "42" → 42
accessor userId!: number;`}></code-block>
          </div>
        </section>

        {/* ═══════════ typed ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="hash" size={20} color="var(--accent)"></loom-icon>
            <h2>typed&lt;T&gt;()</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">typed&lt;T&gt;(schema)</div>
            <div class="dec-desc">
              The <span class="ic">typed&lt;T&gt;()</span> helper generates a schema-based transform that
              converts an object's properties according to the specified constructor functions.
            </div>
            <code-block lang="ts" code={`import { typed } from "@toyz/loom";

interface UserParams {
  id: number;
  name: string;
  active: boolean;
}

// Full schema via typed<T>()
@prop({ params })
@transform(typed<UserParams>({ id: Number, active: Boolean }))
accessor routeParams!: UserParams;`}></code-block>
          </div>
        </section>

        {/* ═══════════ @typedTransformer ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--amber)"></loom-icon>
            <h2>@typedTransformer</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@typedTransformer&lt;T&gt;(schema)</div>
            <div class="dec-desc">
              Shorthand decorator that combines <span class="ic">@transform</span> and <span class="ic">typed&lt;T&gt;()</span> into
              a single decorator. Use when you don't need to compose transforms:
            </div>
            <code-block lang="ts" code={`import { typedTransformer } from "@toyz/loom";

interface UserParams {
  id: number;
  name: string;
}

// These two are equivalent:
@prop({ params })
@transform(typed<UserParams>({ id: Number }))
accessor routeParams!: UserParams;

// Shorthand:
@prop({ params })
@typedTransformer<UserParams>({ id: Number })
accessor routeParams!: UserParams;`}></code-block>
          </div>
        </section>

        {/* ═══════════ Built-in ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="package" size={20} color="var(--cyan)"></loom-icon>
            <h2>Built-in Transformers</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Loom ships with common value transformers you can use with <span class="ic">@transform</span>
              or compose into custom pipelines:
            </div>
            <table class="api-table">
              <thead><tr><th>Transformer</th><th>Conversion</th></tr></thead>
              <tbody>
                <tr><td><code>toNumber</code></td><td>String → number (via parseFloat)</td></tr>
                <tr><td><code>toInt</code></td><td>String → integer (via parseInt)</td></tr>
                <tr><td><code>toFloat</code></td><td>String → float (via parseFloat)</td></tr>
                <tr><td><code>toBoolean</code></td><td>"true"/"1" → true, else false</td></tr>
                <tr><td><code>toDate</code></td><td>String → Date</td></tr>
                <tr><td><code>toJSON</code></td><td>String → parsed JSON</td></tr>
                <tr><td><code>toTrimmed</code></td><td>String → trimmed string</td></tr>
              </tbody>
            </table>
            <code-block lang="ts" code={`import { toNumber, toBoolean, toDate } from "@toyz/loom";

@prop @transform(toNumber) accessor count!: number;
@prop @transform(toBoolean) accessor enabled!: boolean;
@prop @transform(toDate) accessor createdAt!: Date;`}></code-block>
          </div>
        </section>

        {/* ═══════════ Custom ═══════════ */}

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--rose)"></loom-icon>
            <h2>Custom Transforms</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Use <span class="ic">createTransform</span> for reusable transforms with validation or complex logic:
            </div>
            <code-block lang="ts" code={`import { createTransform } from "@toyz/loom";

const toUpperCase = createTransform<string, string>(
  (value) => value.toUpperCase()
);

@prop @transform(toUpperCase) accessor title!: string;`}></code-block>
          </div>
        </section>
      </div>
    );
  }
}
