/**
 * Element — Forms  /element/forms
 *
 * @form<T> decorator for form state with explicit template binding.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementForms extends LoomElement {
  update() {
    return (
      <div>
        <h1>Forms</h1>
        <p class="subtitle">Typed form state with transforms, validation, and explicit binding via <span class="ic">@form</span>.</p>

        <section>
          <h2>Overview</h2>
          <p>
            The <span class="ic">@form</span> decorator creates a typed <span class="ic">FormState&lt;T&gt;</span> object
            with validation, transforms, and dirty tracking. Unlike traditional form libraries that query DOM elements,
            Loom's <span class="ic">@form</span> is <strong>DOM-independent</strong> — you explicitly bind fields
            in your template using <code>.bind(field)</code>.
          </p>
        </section>

        <section>
          <h2>Basic Usage</h2>
          <code-block lang="tsx" code={`import { LoomElement, component, form } from "@toyz/loom";
import type { FormState } from "@toyz/loom";

interface LoginForm {
  email: string;
  password: string;
}

@component("login-form")
class LoginPage extends LoomElement {
  @form<LoginForm>({
    email:    { transform: v => v.trim(), validate: v => v.includes("@") || "Invalid email" },
    password: { validate: v => v.length >= 8 || "Min 8 chars" },
  })
  accessor login!: FormState<LoginForm>;

  update() {
    const f = this.login;
    return (
      <form onSubmit={e => e.preventDefault()}>
        <input value={f.data.email} onInput={f.bind("email")} placeholder="Email" />
        {f.errors.email && <span class="error">{f.errors.email}</span>}

        <input value={f.data.password} onInput={f.bind("password")}
               type="password" placeholder="Password" />
        {f.errors.password && <span class="error">{f.errors.password}</span>}

        <button disabled={!f.valid} onClick={() => this.submit()}>
          Log In
        </button>
        <p>valid: {String(f.valid)} · dirty: {String(f.dirty)}</p>
      </form>
    );
  }

  submit() {
    if (this.login.validate()) {
      console.log("Submitting:", this.login.data);
    }
  }
}`}></code-block>
        </section>

        <section>
          <h2>FormState&lt;T&gt; API</h2>
          <table class="api-table">
            <thead><tr><th>Property / Method</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>.data</code></td><td><code>T</code></td><td>Current transformed values — read in template to render inputs</td></tr>
              <tr><td><code>.errors</code></td><td><code>Partial&lt;Record&lt;keyof T, string&gt;&gt;</code></td><td>Field → error message (only invalid fields)</td></tr>
              <tr><td><code>.valid</code></td><td><code>boolean</code></td><td>True when all validated fields pass</td></tr>
              <tr><td><code>.dirty</code></td><td><code>boolean</code></td><td>True when any field has changed from initial values</td></tr>
              <tr><td><code>.reset()</code></td><td><code>void</code></td><td>Reset all fields to initial values</td></tr>
              <tr><td><code>.validate()</code></td><td><code>boolean</code></td><td>Manually trigger validation on all fields</td></tr>
              <tr><td><code>.bind(field)</code></td><td><code>(e: Event) =&gt; void</code></td><td>Returns an <code>onInput</code> handler for explicit template binding</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Field Schema</h2>
          <p>Each field in the schema can define:</p>
          <table class="api-table">
            <thead><tr><th>Option</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>transform</code></td><td><code>(raw: string) =&gt; V</code></td><td>Transform the raw string input before storing (reuses <span class="ic">@transform</span> functions)</td></tr>
              <tr><td><code>validate</code></td><td><code>(value: V) =&gt; true | string</code></td><td>Return <code>true</code> if valid, or an error message string</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Explicit Binding</h2>
          <p>
            Instead of magic DOM queries, you explicitly wire each input using <code>.bind(field)</code> and
            <code>.data.field</code> for controlled inputs:
          </p>
          <code-block lang="tsx" code={`// Each input is explicitly bound in the template:
<input value={f.data.email} onInput={f.bind("email")} />

// Reset programmatically:
this.login.reset();

// Manual validation trigger:
if (this.login.validate()) {
  console.log("All good!", this.login.data);
}`}></code-block>
        </section>

        <section>
          <h2>Decorator Signature</h2>
          <table class="api-table">
            <thead><tr><th>Argument</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>schema</code></td><td><code>FormSchema&lt;T&gt;</code></td><td>Per-field transform and validation config</td></tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
