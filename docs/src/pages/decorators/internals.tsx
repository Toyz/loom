/**
 * Decorators — ElementInternals  /decorators/internals
 *
 * @state, @aria, @formValue, @validity. Every claim checked against
 * src/element/internals.ts and src/element/form-associated.ts.
 */
import { LoomElement } from "@toyz/loom";
import "../examples/components/internals-demo";

export default class PageDecoratorInternals extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Element Internals"
          subtitle="Make a component a real form control, and give it states and semantics the platform understands."
        ></doc-header>

        <section>
          <p>A custom element is, by default, invisible to the machinery around it. It submits nothing with a form, reports no validity, exposes no role to a screen reader, and has no state a stylesheet can select. Everything about it is private to its own shadow root.</p>
          <p><span class="ic">attachInternals()</span> is the door out of that, and it opens onto three separate things. All of them are feature-detected: where internals are missing the component still renders, it just loses the corresponding behaviour.</p>
          <punch-matrix
            columns="SUBMITS WITH A FORM,SELECTABLE FROM CSS,EXPOSED TO A SCREEN READER"
            rows={[
              { name: "@formValue", punches: "SUBMITS WITH A FORM", note: "The value goes out under the host's name" },
              { name: "@validity", punches: "SUBMITS WITH A FORM", note: "Reported through the browser's own validation" },
              { name: "@state", punches: "SELECTABLE FROM CSS", note: ":state(name), without touching attributes" },
              { name: "@aria", punches: "EXPOSED TO A SCREEN READER", note: "A default role that cannot be forgotten" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="Live">
          <doc-demo
            label="A form-associated component in a real form"
            note="Type an address. The outline is a :state() styled from outside the component, and the readout is the form reporting on a control it knows nothing about."
          >
            <internals-demo></internals-demo>
          </doc-demo>
          <p class="note">
            Nothing in the demo's submit handler knows{" "}
            <span class="ic">demo-email-field</span> exists. It reads{" "}
            <span class="ic">new FormData(form)</span> and the component's value
            is in it, because the browser treats it as a control.
          </p>
        </doc-section>

        <doc-section heading="@formValue — participate in a form">
          <p>
            A component inside a <span class="ic">&lt;form&gt;</span> is furniture until its
            constructor declares itself form-associated. The browser latches that at{" "}
            <span class="ic">customElements.define</span>, which is why it is an option on{" "}
            <span class="ic">@component</span> and not something you can set later — setting it
            afterwards is ignored, silently.
          </p>
          <code-block lang="ts" code={FORM_VALUE}></code-block>
          <p>
            The form then sees it as a control: the value submits under the element's{" "}
            <span class="ic">name</span>, <span class="ic">form.elements</span> lists it, and a
            reset restores the value the component was constructed with.
          </p>
          <api-table
            head={["Value type", "Submitted as", "Why"]}
            rows={[
              ["string", <code>the string</code>, "The ordinary case"],
              ["boolean", <code>"on"</code> as any, "Checkbox semantics — absent when false, so a toggle round-trips"],
              ["File / FormData", "itself", "Passed through for uploads and multi-part values"],
              ["null / undefined", "nothing", "The control submits no entry at all"],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="@validity — constraint validation">
          <p>
            Return <span class="ic">true</span> for valid, or a string for invalid — the string
            is the message the browser shows.
          </p>
          <code-block lang="ts" code={VALIDITY}></code-block>
          <p class="note">
            Reported as <span class="ic">customError</span>, not as one of the built-in flags
            like <span class="ic">valueMissing</span>. The constraint came from your component,
            and claiming a built-in flag would misreport which one failed.
          </p>
          <p class="tip">
            Several validators on one component report the first failure. A control is valid or
            it is not — that is the unit a form works in, and the message shown is the first
            reason it is not.
          </p>
          <api-table
            head={["Helper", "Returns"]}
            rows={[
              [<code>checkValidity(el)</code>, "Whether every validator passes"],
              [<code>reportValidity(el)</code>, "The same, and shows the browser's validation bubble"],
              [<code>validationMessage(el)</code>, "The current message, empty when valid"],
              [<code>formOf(el)</code>, "The form this element belongs to, or null"],
              [<code>revalidate(el)</code>, "Re-run the validators by hand"],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="@state — :state() in CSS">
          <p>
            A custom state is selectable from CSS, including from outside the shadow root by a
            parent, without adding a class or an attribute to the host.
          </p>
          <code-block lang="ts" code={STATE}></code-block>
          <p>
            This is the sanctioned replacement for toggling a class on the host. A class is part
            of the public markup: anything on the page can set it, remove it, or collide with
            it. A custom state cannot be written from outside the component at all.
          </p>
          <p class="note">
            The value is coerced the way a template would read it, so a nullable string works as
            an on/off state without a second boolean beside it. An initial <span class="ic">true</span> is
            applied on connect — otherwise a component that starts in a state would render once
            without it and only pick it up on the first write.
          </p>
        </doc-section>

        <doc-section heading="@aria — semantics that survive">
          <p>
            A default role and ARIA properties that live on the element rather than in its
            attributes, so they do not have to be repeated at every usage and cannot be lost
            when someone writes the tag without them.
          </p>
          <code-block lang="ts" code={ARIA}></code-block>
          <p class="tip">
            An attribute on the host still wins, which is what lets a caller override a default.
            Use <span class="ic">setAria(el, prop, value)</span> for values that change, such as
            an expanded state.
          </p>
        </doc-section>

        <doc-section heading="Browser support">
          <p>
            <span class="ic">attachInternals</span> is in every current browser; Safari added it
            in 16.4. <span class="ic">CustomStateSet</span> landed later, and older Chrome wanted{" "}
            <span class="ic">--dashed</span> state names — both spellings are written, so a
            component authored today keeps working on the browsers that shipped the draft.
          </p>
          <p class="note">
            Everything degrades rather than throws. Where internals are missing,{" "}
            <span class="ic">@state</span> is a no-op, <span class="ic">@formValue</span> keeps
            the value in the field, validators still run for{" "}
            <span class="ic">checkValidity(el)</span>, and the component renders exactly as it
            otherwise would. Check with <span class="ic">supportsInternals()</span> if you need
            to branch.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}

const FORM_VALUE = `import { LoomElement, component, formValue } from "@toyz/loom";

@component("my-field", { formAssociated: true })
class MyField extends LoomElement {
  @formValue accessor value = "";

  update() {
    return (
      <input
        value={this.value}
        onInput={(e) => (this.value = e.target.value)}
      />
    );
  }
}`;

const VALIDITY = `@component("email-field", { formAssociated: true })
class EmailField extends LoomElement {
  @validity((v: string) => v.includes("@") || "Enter an email address")
  @formValue
  accessor email = "";
}

// Anywhere:
checkValidity(el);        // false
validationMessage(el);    // "Enter an email address"

// And natively, without knowing the component exists:
form.checkValidity();     // false
form.reportValidity();    // shows the bubble on the field`;

const STATE = `@component("my-button")
class MyButton extends LoomElement {
  @state accessor loading = false;
  @state("has-error") accessor error: string | null = null;
}

/* CSS — from anywhere, including the page that uses the component:

   my-button:state(loading)   { opacity: 0.6; pointer-events: none; }
   my-button:state(has-error) { outline: 2px solid red; }
*/`;

const ARIA = `import { aria, setAria } from "@toyz/loom";

@component("my-switch")
@aria({ role: "switch", ariaChecked: "false" })
class MySwitch extends LoomElement {
  @reactive accessor on = false;

  toggle() {
    this.on = !this.on;
    setAria(this, "ariaChecked", String(this.on));
  }
}`;
