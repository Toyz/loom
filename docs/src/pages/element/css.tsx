/**
 * CSS — /element/css
 *
 * The css`` tagged template, @styles decorator, scoped styles model.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementCSS extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="CSS" subtitle="Constructable stylesheets, shared by text, adopted once per component."></doc-header>

        <section>
          <p>Every instance of a component adopting the same stylesheet should share one <span class="ic">CSSStyleSheet</span> object, not parse its own copy. That is what constructable stylesheets are for, and it is the difference between a thousand rows costing one style parse and costing a thousand.</p>
          <p>The <span class="ic">css</span> tag builds and caches those sheets by their text, so two call sites producing identical CSS share one object. Styles come in two kinds: static sheets adopted once at connect via <span class="ic">@styles</span>, and <span class="ic">@dynamicCss</span>, which re-evaluates a method whenever the reactive fields it reads change. Reach for the second only when a value genuinely cannot be a custom property.</p>
          <punch-matrix
            columns="SHARED SHEET,RE-EVALUATES ON STATE,PER INSTANCE,SURVIVES A MORPH"
            rows={[
              { name: "@styles(sheet)", punches: "SHARED SHEET,SURVIVES A MORPH", note: "One CSSStyleSheet for every instance" },
              { name: "style attribute", punches: "PER INSTANCE", note: "Re-applied by the morph on every render" },
              { name: "@dynamicCss", punches: "RE-EVALUATES ON STATE,PER INSTANCE,SURVIVES A MORPH", note: "Rebuilt when a reactive field it read changes" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="The css`` Tagged Template">
            <p>
              Loom provides a <span class="ic">css</span> tagged template literal that creates a <span class="ic">CSSStyleSheet</span> object. The sheet is parsed once and cached — subsequent
              calls with the same template return the same instance.
            </p>
            <code-block lang="ts" code={`import { css } from "@toyz/loom";

const styles = css\`
  :host { display: block; padding: 16px; }
  .title { font-size: 1.5rem; font-weight: 700; }
  .subtitle { color: #888; }
\`;`}></code-block>
        </doc-section>
        <doc-section heading="@styles Decorator">
          <api-entry sig="@styles(sheet, ...)">
            <p>
              The recommended way to apply styles. Auto-adopts one or more <span class="ic">CSSStyleSheet</span>s when the element connects.
              No boilerplate needed.
            </p>
            <code-block lang="ts" code={`import { component, styles, css, LoomElement } from "@toyz/loom";

const sheet = css\`
  :host { display: block; }
  .card {
    padding: 16px; border-radius: 8px;
    background: var(--surface-2); border: 1px solid var(--border);
  }
\`;

@component("my-card")
@styles(sheet)
class MyCard extends LoomElement {
  update() {
    return <div class="card"><slot></slot></div>;
  }
}`}></code-block>
          </api-entry>
            <p>
              Multiple <span class="ic">@styles()</span> calls stack — all sheets are adopted. Useful for composing shared + component-specific styles:
            </p>
            <code-block lang="ts" code={`import { baseStyles } from "../styles/base";
import { buttonStyles } from "../styles/buttons";

@component("my-form")
@styles(baseStyles, buttonStyles, formSheet)
class MyForm extends LoomElement { ... }`}></code-block>
        </doc-section>
        <doc-section heading="Inline Styles in update()">
            <p>
              For quick prototyping, call <span class="ic">this.css``</span> inside <span class="ic">update()</span>.
              The sheet is adopted into the shadow root automatically. Since it's cached, there's no
              performance penalty from calling it on every render.
            </p>
            <code-block lang="ts" code={`@component("my-card")
class MyCard extends LoomElement {
  update() {
    this.css\`
      :host { display: block; border-radius: 8px; padding: 16px; }
      .title { font-weight: 700; }
    \`;

    return (
      <div>
        <h2 class="title">{this.title}</h2>
        <slot></slot>
      </div>
    );
  }
}`}></code-block>
          <doc-notification type="note">
            <loom-icon name="bolt" size={14} color="var(--text-muted)"></loom-icon> Prefer <span class="ic">@styles(sheet)</span> for production components — it separates concerns
            and avoids style adoption on every render call.
          </doc-notification>
        </doc-section>
        <doc-section heading="How It Works">
          <table class="api-table">
            <thead><tr><th>Step</th><th>What Happens</th></tr></thead>
            <tbody>
              <tr><td>1</td><td><code>css`...`</code> parses the template into a <code>CSSStyleSheet</code></td></tr>
              <tr><td>2</td><td>The sheet is cached by template identity — same template, same sheet</td></tr>
              <tr><td>3</td><td><code>@styles(sheet)</code> adopts it into <code>shadow.adoptedStyleSheets</code> on connect</td></tr>
              <tr><td>4</td><td>Shadow DOM scoping ensures styles don't leak or collide with other components</td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-section heading=":host and Scoping">
            <p>
              All styles are scoped to the component's shadow root. Use <span class="ic">:host</span> to style the
              component's outer element, and <span class="ic">:host(.class)</span> for conditional styling based on
              host attributes or classes.
            </p>
            <code-block lang="ts" code={`const sheet = css\`
  :host { display: flex; gap: 8px; }
  :host([disabled]) { opacity: 0.5; pointer-events: none; }
  :host(.compact) { padding: 4px; }
  ::slotted(p) { margin: 0; }
\`;`}></code-block>
        </doc-section>
        <doc-section heading="Dynamic Values">
            <p>
              Use CSS custom properties for dynamic values. The template is parsed once, and you
              update custom properties on the host to change styles:
            </p>
            <code-block lang="ts" code={`const sheet = css\`
  :host { border: 2px solid var(--card-accent); }
  .title { color: var(--card-accent); }
\`;

@component("theme-card")
@styles(sheet)
class ThemeCard extends LoomElement {
  @prop accessor accent = "#818cf8";

  update() {
    this.style.setProperty("--card-accent", this.accent);
    return <h2 class="title"><slot></slot></h2>;
  }
}`}></code-block>
        </doc-section>
        <doc-section heading="API Reference">
          <api-table
            head={["API", "Type", "Description"]}
            rows={[
              [<code>css`...`</code>, "Tagged template", "Create a cached CSSStyleSheet"],
              [<code>@styles(sheet, ...)</code>, "Class decorator", "Auto-adopt stylesheets on connect"],
              [<code>this.css`...`</code>, "Instance method", "Adopt inline styles in update()"],
              [<code>this.adoptStyles(sheets)</code>, "Instance method", "Programmatic style adoption"],
            ]}
          ></api-table>
        </doc-section>
        <doc-section heading="Tokens">
          <p>
            The loudest thing in most component stylesheets is not the CSS. It is{" "}
            <span class="ic">var(--text-muted, #6d6858)</span> written out again for every
            property that wants a colour, with the fallback repeated each time.
          </p>
          <p>
            The repetition is not only noise. Each copy is written by hand, so the fallbacks
            drift — and a fallback <em>only</em> renders when the token is undefined, which is
            exactly when nobody is looking. What accumulates is a second, contradictory palette
            behind the real one.
          </p>
          <doc-notification type="caution">
            These docs had 479 hand-written <span class="ic">var(--token, fallback)</span> pairs.{" "}
            <span class="ic">--text-muted</span> had picked up five different fallbacks
            (<span class="ic">#555</span>, <span class="ic">#666</span>,{" "}
            <span class="ic">#6d6858</span>, <span class="ic">#888</span>) and{" "}
            <span class="ic">--accent</span> two unrelated purples. Whichever file you happened
            to render decided what a missing token looked like.
          </doc-notification>
          <code-block lang="ts" code={TOKENS}></code-block>
          <api-table
            head={["", "Gives you"]}
            rows={[
              [<code>t.textMuted</code>, <><code>"var(--text-muted, #6d6858)"</code> — the fallback, written once</>],
              [<code>t.$sheet</code>, "A stylesheet declaring the properties, generated from the same literals"],
              [<code>t.$sheetFor(sel)</code>, <>The same on a selector you choose, e.g. <code>:root</code></>],
              [<code>t.$value.thread</code>, <>The raw value, for a canvas or anywhere <code>var()</code> cannot go</>],
              [<code>t.$name("thread")</code>, <><code>"--thread"</code>, the property name</>],
            ]}
          ></api-table>
          <p class="note">
            Names are camelCase and become kebab-case, with digits starting a new part:{" "}
            <span class="ic">textMuted</span> is <span class="ic">--text-muted</span> and{" "}
            <span class="ic">space1</span> is <span class="ic">--space-1</span>. Because{" "}
            <span class="ic">$sheet</span> is generated from the same literals as the fallbacks,
            the declaration and the fallback cannot disagree.
          </p>
          <p class="tip">
            Converting these docs turned up a token that was never declared at all —
            <span class="ic">--space-7</span>, on a scale that skips 7. It had always been
            rendering its fallback, and nothing said so. That is the failure mode this is for:
            not ugly CSS, but CSS that is quietly wrong.
          </p>
        </doc-section>

        <doc-section heading="Composing stylesheets">
          <p>
            A <span class="ic">css</span> sheet can be interpolated into another, so a shared
            block of rules is written once instead of pasted.
          </p>
          <code-block lang="ts" code={COMPOSE}></code-block>
          <p class="note">
            The fragment's text is inlined, so the result is a single sheet. Adopt the composed
            sheet, not both — adopting the fragment as well would apply its rules twice.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}

const TOKENS = `import { tokens, css } from "@toyz/loom";

export const t = tokens({
  ground:    "#14140f",
  thread:    "#c4472f",
  textMuted: "#6d6858",
  space1:    "0.25rem",
});

const styles = css\`
  :host  { background: \${t.ground}; color: \${t.textMuted}; }
  button { border: 1px solid \${t.thread}; padding: \${t.space1}; }
\`;

// Declare the properties themselves, once, at the root of the app:
@styles(t.$sheetFor(":root"))
class AppShell extends LoomElement {}`;

const COMPOSE = `const control = css\`
  .control { font: inherit; border-radius: 2px; }
\`;

const styles = css\`
  \${control}
  .control:hover { border-color: \${t.thread}; }
\`;`;
