/**
 * Contact Form — Live demo of @form with validation, transforms, and dirty tracking.
 *
 * Demonstrates: @component, @form, @styles, toTrimmed, FormState<T>
 */
import {
  LoomElement, component, form, css, styles,
} from "@toyz/loom";
import type { FormState } from "@toyz/loom";

interface ContactData {
  name: string;
  email: string;
  message: string;
}

const sheet = css`
  :host { display: block; }

  form {
    display: flex; flex-direction: column; gap: 1rem;
  }

  .field {
    display: flex; flex-direction: column; gap: 0.3rem;
  }
  .field label {
    font-size: 0.82rem; font-weight: 600;
    color: var(--text-secondary, #9898ad);
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .field input,
  .field textarea {
    padding: 0.75rem 1rem;
    border: 1px solid var(--border, #2a2a3a); border-radius: 8px;
    background: var(--surface-2, #16161e); color: var(--text, #e8e8f0);
    font-size: 0.95rem; font-family: inherit; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
    resize: vertical;
  }
  .field input::placeholder,
  .field textarea::placeholder {
    color: var(--text-muted, #5e5e74);
  }
  .field input:focus,
  .field textarea:focus {
    border-color: var(--accent, #818cf8);
    box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.15);
  }
  .field textarea { min-height: 100px; }

  .field .error-msg {
    font-size: 0.78rem; color: #f87171;
    display: flex; align-items: center; gap: 0.25rem;
  }
  .field input.invalid,
  .field textarea.invalid {
    border-color: #f87171;
    box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.1);
  }

  .actions {
    display: flex; gap: 0.75rem; align-items: center; margin-top: 0.5rem;
  }
  .submit-btn {
    display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.7rem 1.5rem; border: none; border-radius: 8px;
    background: var(--accent, #818cf8); color: #fff;
    font-weight: 600; font-size: 0.92rem;
    cursor: pointer; transition: opacity 0.15s, transform 0.1s;
  }
  .submit-btn:hover { opacity: 0.9; }
  .submit-btn:active { transform: scale(0.97); }
  .submit-btn:disabled {
    opacity: 0.4; cursor: not-allowed; transform: none;
  }

  .reset-btn {
    padding: 0.7rem 1.25rem; border: 1px solid var(--border, #2a2a3a);
    border-radius: 8px; background: transparent;
    color: var(--text-muted, #888); font-size: 0.85rem;
    cursor: pointer; transition: all 0.15s;
  }
  .reset-btn:hover {
    border-color: var(--text-secondary, #9898ad);
    color: var(--text, #e8e8f0);
  }

  .status {
    display: flex; gap: 1rem; flex-wrap: wrap;
    padding: 0.75rem 1rem;
    border-radius: 8px; background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-subtle, #1e1e2a);
    font-size: 0.82rem; color: var(--text-muted, #5e5e74);
    font-family: var(--font-mono, monospace);
  }
  .status .tag {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.2rem 0.6rem; border-radius: 4px;
    background: rgba(255,255,255,0.04);
  }
  .status .dot {
    width: 6px; height: 6px; border-radius: 50%;
    display: inline-block;
  }
  .status .dot.on { background: #34d399; }
  .status .dot.off { background: #6b7280; }

  .toast {
    padding: 0.75rem 1rem; border-radius: 8px;
    background: rgba(52, 211, 153, 0.1);
    border: 1px solid rgba(52, 211, 153, 0.3);
    color: #34d399; font-size: 0.85rem;
    animation: fadeIn 0.3s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

@component("contact-form")
@styles(sheet)
class ContactForm extends LoomElement {
  @form<ContactData>({
    name: {
      transform: (v: string) => v.trim(),
      validate: (v: string) => v.length >= 2 || "Name must be at least 2 characters",
    },
    email: {
      transform: (v: string) => v.trim(),
      validate: (v: string) => v.includes("@") && v.includes(".") || "Please enter a valid email",
    },
    message: {
      transform: (v: string) => v.trim(),
      validate: (v: string) => v.length >= 10 || "Message must be at least 10 characters",
    },
  })
  accessor contact!: FormState<ContactData>;

  private submitted = false;

  private handleSubmit() {
    this.contact?.validate().match({
      ok: (data) => {
        this.submitted = true;
        console.log("Form submitted:", data);
        // Auto-hide after 3s
        setTimeout(() => {
          this.submitted = false;
          this.contact.reset();
          this.scheduleUpdate();
        }, 3000);
        this.scheduleUpdate();
      },
      err: (errors) => {
        console.log("Validation failed:", errors);
      },
    });
  }

  private handleReset() {
    this.contact?.reset();
    this.submitted = false;
    this.scheduleUpdate();
  }

  update() {
    const c = this.contact;
    return (
      <div>
        {this.submitted && (
          <div class="toast">
            ✓ Message sent! Form will reset in 3 seconds.
          </div>
        )}

        <form onSubmit={(e: Event) => e.preventDefault()}>
          <div class="field">
            <label>Name</label>
            <input
              name="name"
              placeholder="Ada Lovelace"
              value={c.data.name}
              onInput={c.bind("name")}
              class={c?.errors.name ? "invalid" : ""}
            />
            {c?.errors.name && <span class="error-msg">⚠ {c.errors.name}</span>}
          </div>

          <div class="field">
            <label>Email</label>
            <input
              name="email"
              type="email"
              placeholder="ada@example.com"
              value={c.data.email}
              onInput={c.bind("email")}
              class={c?.errors.email ? "invalid" : ""}
            />
            {c?.errors.email && <span class="error-msg">⚠ {c.errors.email}</span>}
          </div>

          <div class="field">
            <label>Message</label>
            <textarea
              name="message"
              placeholder="Tell us about your project..."
              value={c.data.message}
              onInput={c.bind("message")}
              class={c?.errors.message ? "invalid" : ""}
            />
            {c?.errors.message && <span class="error-msg">⚠ {c.errors.message}</span>}
          </div>

          <div class="actions">
            <button
              class="submit-btn"
              type="button"
              disabled={!c?.valid}
              onClick={() => this.handleSubmit()}
            >
              Send Message
            </button>
            <button
              class="reset-btn"
              type="button"
              onClick={() => this.handleReset()}
            >
              Reset
            </button>
          </div>
        </form>

        <div class="status">
          <span class="tag">
            <span class={`dot ${c?.valid ? "on" : "off"}`}></span>
            valid: {String(c?.valid ?? false)}
          </span>
          <span class="tag">
            <span class={`dot ${c?.dirty ? "on" : "off"}`}></span>
            dirty: {String(c?.dirty ?? false)}
          </span>
        </div>
      </div>
    );
  }
}
