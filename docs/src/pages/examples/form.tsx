/**
 * Example — Contact Form
 *
 * Live demo: @form, FormState<T>, toTrimmed, validation, dirty tracking
 */
import { LoomElement } from "@toyz/loom";
import "./components/contact-form";

const SOURCE = `import {
  LoomElement, component, form, css, styles,
} from "@toyz/loom";
import type { FormState } from "@toyz/loom";

interface ContactData {
  name: string;
  email: string;
  message: string;
}

const sheet = css\`
  :host { display: block; }
  form { display: flex; flex-direction: column; gap: 1rem; }
  .field { display: flex; flex-direction: column; gap: 0.3rem; }
  .field label { font-size: 0.82rem; font-weight: 600; text-transform: uppercase; }
  .field input, .field textarea {
    padding: 0.75rem 1rem; border: 1px solid var(--border);
    border-radius: 8px; background: var(--surface-2); color: var(--text);
    font-size: 0.95rem; outline: none;
  }
  .submit-btn {
    padding: 0.7rem 1.5rem; border: none; border-radius: 8px;
    background: var(--accent); color: #fff; font-weight: 600;
    cursor: pointer;
  }
  .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
\`;

@component("contact-form")
@styles(sheet)
class ContactForm extends LoomElement {
  @form<ContactData>({
    name: {
      transform: v => v.trim(),
      validate: v => v.length >= 2 || "Name must be at least 2 characters",
    },
    email: {
      transform: v => v.trim(),
      validate: v => v.includes("@") && v.includes(".") || "Invalid email",
    },
    message: {
      transform: v => v.trim(),
      validate: v => v.length >= 10 || "Message must be at least 10 chars",
    },
  })
  accessor contact!: FormState<ContactData>;

  handleSubmit() {
    if (this.contact?.validate()) {
      console.log("Submitted:", this.contact.data);
    }
  }

  update() {
    const c = this.contact;
    return (
      <form onSubmit={e => e.preventDefault()}>
        <div class="field">
          <label>Name</label>
          <input name="name" placeholder="Ada Lovelace"
                 value={c.data.name} onInput={c.bind("name")} />
          {c?.errors.name && <span class="error">{c.errors.name}</span>}
        </div>
        <div class="field">
          <label>Email</label>
          <input name="email" type="email" placeholder="ada@example.com"
                 value={c.data.email} onInput={c.bind("email")} />
          {c?.errors.email && <span class="error">{c.errors.email}</span>}
        </div>
        <div class="field">
          <label>Message</label>
          <textarea name="message" placeholder="Tell us about your project..."
                    value={c.data.message} onInput={c.bind("message")} />
          {c?.errors.message && <span class="error">{c.errors.message}</span>}
        </div>
        <button class="submit-btn" disabled={!c?.valid}
                onClick={() => this.handleSubmit()}>
          Send Message
        </button>
        <p>valid: {String(c?.valid)} · dirty: {String(c?.dirty)}</p>
      </form>
    );
  }
}`;

export default class ExampleForm extends LoomElement {
  update() {
    return (
      <div>
        <h1>Contact Form</h1>
        <p class="subtitle">
          Bidirectional form binding with <span class="ic">@form</span>,{" "}
          <span class="ic">toTrimmed</span>, and validation.
        </p>

        <section>
          <h2>Live Demo</h2>
          <p>
            Type in the fields below — validation runs in real-time, and the
            status bar at the bottom shows <span class="ic">.valid</span> and{" "}
            <span class="ic">.dirty</span> state.
          </p>
          <contact-form></contact-form>
        </section>

        <section>
          <h2>Source</h2>
          <code-block lang="tsx" code={SOURCE}></code-block>
        </section>

        <section>
          <h2>Key Concepts</h2>
          <table class="api-table">
            <thead><tr><th>Feature</th><th>How It's Used</th></tr></thead>
            <tbody>
              <tr>
                <td><code>@form&lt;T&gt;(schema)</code></td>
                <td>Creates typed <code>FormState&lt;T&gt;</code> with validation, transforms, and dirty tracking</td>
              </tr>
              <tr>
                <td><code>.bind(field)</code></td>
                <td>Returns an <code>onInput</code> handler — explicit binding in the template</td>
              </tr>
              <tr>
                <td><code>toTrimmed</code></td>
                <td>Built-in transform that trims whitespace from string inputs</td>
              </tr>
              <tr>
                <td><code>validate</code></td>
                <td>Returns <code>true</code> for valid, or an error string</td>
              </tr>
              <tr>
                <td><code>.valid / .dirty</code></td>
                <td>Reactive state: all fields pass ↔ any field changed from initial</td>
              </tr>
              <tr>
                <td><code>.reset()</code></td>
                <td>Restores all fields to initial values</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
