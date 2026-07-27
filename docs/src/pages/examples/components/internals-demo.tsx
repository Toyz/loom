/**
 * Element Internals Demo — <internals-demo>
 *
 * A form-associated custom element inside a real `<form>`, so the thing being
 * demonstrated is the form's own reporting: `new FormData(form)` contains the
 * component's value, and `form.checkValidity()` is false because of a
 * validator declared on a class. Neither of those was possible before.
 *
 * The field also carries a `:state()`, styled from this component's stylesheet
 * -- across the shadow boundary, without the field exposing an attribute.
 */
import {
  LoomElement, component, reactive, formValue, validity, state,
  checkValidity, validationMessage, css, styles,
} from "@toyz/loom";
import { t } from "../../../tokens";

// ── The control ──

const fieldStyles = css`
  :host { display: block; }
  input {
    width: 100%;
    padding: 0.45rem 0.6rem;
    border: 1px solid ${t.warpLit};
    border-radius: 2px;
    background: ${t.groundSunk};
    color: ${t.textPrimary};
    font: inherit;
    font-size: 0.8125rem;
  }
  input:focus-visible { outline: 2px solid ${t.thread}; outline-offset: 1px; }
`;

@component("demo-email-field", { formAssociated: true })
@styles(fieldStyles)
export class DemoEmailField extends LoomElement {
  /** Submitted with the surrounding form, under the host's `name`. */
  @validity((v: string) => v.includes("@") || "Enter an email address")
  @formValue
  accessor value = "";

  /** Selectable as demo-email-field:state(filled) -- see the parent's CSS. */
  @state accessor filled = false;

  private onInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
    this.filled = this.value.length > 0;
  }

  update() {
    return (
      <input
        type="text"
        placeholder="you@example.com"
        value={this.value}
        onInput={(e: Event) => this.onInput(e)}
      />
    );
  }
}

// ── The demo around it ──

const demoStyles = css`
  :host { display: block; }

  form { display: grid; gap: 0.75rem; }

  label {
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${t.textMuted};
  }

  /* Styling a component's internal state from outside it, with no attribute
     and no class -- the field cannot have this overwritten from the page. */
  demo-email-field:state(filled) {
    outline: 1px solid ${t.ok};
    outline-offset: 2px;
    border-radius: 2px;
  }

  .row { display: flex; gap: 0.5rem; }

  button {
    padding: 0.45rem 0.9rem;
    border: 1px solid ${t.warpLit};
    border-radius: 2px;
    background: ${t.groundRaised};
    color: ${t.textPrimary};
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
  }
  button:hover { border-color: ${t.thread}; }

  .readout {
    display: grid;
    gap: 3px;
    margin: 0;
    padding: 0.6rem 0.75rem;
    border: 1px solid ${t.warp};
    border-radius: 2px;
    background: ${t.groundSunk};
    font-family: ${t.fontMono};
    font-size: 0.6875rem;
    color: ${t.textMuted};
  }
  .readout b { color: ${t.textSecondary}; font-weight: 500; }
  .ok  { color: ${t.ok}; }
  .bad { color: ${t.thread}; }
`;

@component("internals-demo")
@styles(demoStyles)
export class InternalsDemo extends LoomElement {
  @reactive accessor submitted = "";
  @reactive accessor tick = 0;

  private get field(): HTMLElement | null {
    return this.shadowRoot?.querySelector("demo-email-field") ?? null;
  }

  private onSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    // The component's value arrives here without this code knowing it exists.
    const data = new FormData(form);
    this.submitted = JSON.stringify(Object.fromEntries(data.entries()));
  }

  update() {
    const field = this.field;
    const valid = field ? checkValidity(field) : true;
    const message = field ? validationMessage(field) : "";
    void this.tick; // re-read after each input

    return (
      <form onSubmit={(e: Event) => this.onSubmit(e)} onInput={() => this.tick++}>
        <label for="email">Email</label>
        <demo-email-field id="email" name="email"></demo-email-field>

        <div class="row">
          <button type="submit">Submit</button>
          <button type="reset" onClick={() => (this.submitted = "")}>Reset</button>
        </div>

        <p class="readout">
          <span>
            <b>form.checkValidity()</b>{" "}
            <span class={valid ? "ok" : "bad"}>{String(valid)}</span>
          </span>
          <span><b>validationMessage</b> {message || "—"}</span>
          <span><b>FormData on submit</b> {this.submitted || "—"}</span>
        </p>
      </form>
    );
  }
}
