/**
 * Example — Contact Form
 *
 * Live demo: @form, FormState<T>, toTrimmed, validation, dirty tracking
 */
import { LoomElement } from "@toyz/loom";
import "./components/contact-form";

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
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Live Demo</h2>
          </div>
          <p>
            Type in the fields below — validation runs in real-time, and the
            status bar at the bottom shows <span class="ic">.valid</span> and{" "}
            <span class="ic">.dirty</span> state.
          </p>
          <contact-form></contact-form>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/contact-form.tsx"></source-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--accent)"></loom-icon>
            <h2>Key Concepts</h2>
          </div>
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
                <td>Returns <code>LoomResult&lt;T, errors&gt;</code> — use <code>.match()</code> for exhaustive handling</td>
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
