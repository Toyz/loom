/**
 * Decorators — Popover & Dialog  /decorators/overlay
 */
import { LoomElement } from "@toyz/loom";
import "../examples/components/overlay-demo";

export default class PageDecoratorOverlay extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Popover &amp; Dialog"
          subtitle="Menus, tooltips and modals on the browser's top layer, driven by a boolean."
        ></doc-header>

        <section>
          <p>Both put content in the <strong>top layer</strong>, which is the part worth having. An element there paints above everything regardless of where it sits in the tree — so it does not need to be moved out of its shadow root to escape a stacking context, which is what <loom-link to="/decorators/portal" style="color: var(--accent)">@portal</loom-link> exists to do and why reaching for it is usually no longer necessary.</p>
          <p>What you get without writing it: light dismiss, Escape to close, a <span class="ic">::backdrop</span>, focus moved in and restored on close, and for a modal dialog everything behind it made inert. The inert part is the one hand-rolled versions almost always get wrong, because it means finding every focusable element on the page, disabling it, and putting it all back afterwards.</p>
          <punch-matrix
            columns="TOP LAYER,LIGHT DISMISS,BACKDROP,PAGE INERT"
            rows={[
              { name: "@popover", punches: "TOP LAYER,LIGHT DISMISS,BACKDROP", note: "Menus, tooltips, comboboxes" },
              { name: "@dialog (modal)", punches: "TOP LAYER,BACKDROP,PAGE INERT", note: "Confirmations — Escape closes, focus is trapped" },
              { name: "@portal", punches: "", note: "Moves the DOM instead. Still useful for non-overlay teleports" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="Live">
          <doc-demo
            label="@popover and @dialog"
            note="The dashed box clips its overflow. The menu is not clipped, because it is not in the box — it is in the top layer. Press Escape, or click outside, and watch the accessor follow."
          >
            <overlay-demo></overlay-demo>
          </doc-demo>
        </doc-section>

        <doc-section heading="@popover">
          <api-entry sig="@popover">
            <p>Drives a <span class="ic">[popover]</span> element from a boolean accessor.</p>
            <code-block lang="tsx" code={POPOVER}></code-block>
          </api-entry>
          <p>
            Defaults to the first <span class="ic">[popover]</span> in the shadow root, which is
            what the markup already says. Pass <span class="ic">{`{ target: "#menu" }`}</span> when
            there is more than one.
          </p>
        </doc-section>

        <doc-section heading="@dialog">
          <api-entry sig="@dialog">
            <p>Drives a <span class="ic">&lt;dialog&gt;</span>. Modal by default.</p>
            <code-block lang="tsx" code={DIALOG}></code-block>
          </api-entry>
          <api-table
            head={["Option", "Type", "Description"]}
            rows={[
              [<code>modal</code>, "boolean", <>Open with <code>showModal()</code> (default) or <code>show()</code></>],
              [<code>target</code>, "string", <>Selector for the overlay element. Defaults to <code>dialog</code></>],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="The state and the DOM cannot drift">
          <p>
            This is the reason it is a decorator and not a call to{" "}
            <span class="ic">showPopover()</span> in a click handler. Escape, a click outside,
            and a <span class="ic">&lt;form method="dialog"&gt;</span> submit all close the
            overlay without going through your code. Each of those writes{" "}
            <span class="ic">false</span> back to the accessor.
          </p>
          <code-block lang="ts" code={WRITEBACK}></code-block>
          <p class="note">
            An open dialog is also closed when the component disconnects. A modal left in the
            top layer after its component is gone keeps the rest of the page inert with nothing
            left on screen to dismiss it.
          </p>
        </doc-section>

        <doc-section heading="Browser support">
          <p>
            <span class="ic">&lt;dialog&gt;</span> is everywhere. The popover API is Chrome and
            Edge 114+, Safari 17+, Firefox 125+.
          </p>
          <p class="note">
            Where the popover API is missing, the element's <span class="ic">hidden</span> property
            is toggled instead: the content still appears and disappears, but without the top
            layer, light dismiss or backdrop. It degrades to a plain conditional panel rather
            than to nothing.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}

const POPOVER = `import { component, popover } from "@toyz/loom";

@component("my-menu")
class MyMenu extends LoomElement {
  @popover accessor open = false;

  update() {
    return (
      <>
        <button onClick={() => (this.open = !this.open)}>Menu</button>
        <div popover="auto">
          <a href="/settings">Settings</a>
          <a href="/logout">Log out</a>
        </div>
      </>
    );
  }
}`;

const DIALOG = `@component("delete-confirm")
class DeleteConfirm extends LoomElement {
  @dialog accessor open = false;

  update() {
    return (
      <>
        <button onClick={() => (this.open = true)}>Delete</button>
        <dialog>
          <p>Delete this permanently?</p>
          <form method="dialog">
            <button value="cancel">Cancel</button>
            <button value="ok" onClick={() => this.remove()}>Delete</button>
          </form>
        </dialog>
      </>
    );
  }
}`;

const WRITEBACK = `this.open = true;   // opens it

// user presses Escape, or clicks outside
this.open;          // false — the DOM told the accessor`;
