/**
 * Guides — Hydration  /guides/hydration
 *
 * Declarative Shadow DOM. Every claim here was read out of
 * src/element/element.ts and tests/dsd-hydration.test.ts — in particular the
 * fact that there is no hydration algorithm at all, which the previous copy
 * described as if there were one.
 */
import { LoomElement } from "@toyz/loom";

export default class PageGuidesHydration extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Hydration"
          subtitle="The server paints it, the browser attaches it, and Loom adopts what is already there."
        ></doc-header>

        <section>
          <p>A client-rendered component shows nothing until its JavaScript has downloaded, parsed and run. Server-rendering the markup fixes the blank screen and introduces the harder problem: a shadow root is created by script, so there has historically been nothing for the server to render into.</p>
          <p>Declarative Shadow DOM closes that gap. The server emits the shadow content as ordinary markup, the browser attaches it during parse, and Loom reuses it rather than building its own. The pixels arrive before the bundle does, and no framework code was involved in putting them there.</p>
          <punch-matrix
            columns="PAINTS BEFORE JS,NEEDS A SERVER,DISCARDS SERVER MARKUP,CAN MISMATCH"
            rows={[
              { name: "client render", punches: "DISCARDS SERVER MARKUP", note: "Blank until the bundle has parsed" },
              { name: "declarative shadow DOM", punches: "PAINTS BEFORE JS,NEEDS A SERVER", note: "Loom morphs against the markup already there" },
            ]}
          ></punch-matrix>
          <p class="note">
            The last column is empty on purpose. Hydration mismatch is a whole
            category of bug in frameworks that diff a virtual tree against
            server HTML and give up when the two disagree. It does not exist
            here, for the reason in <span class="ic">How it works</span> below.
          </p>
        </section>

        <doc-section heading="Basic usage">
          <p>
            Put a <span class="ic">{`<template shadowrootmode="open">`}</span> inside the custom
            element in your HTML. The browser turns it into a real shadow root while parsing,
            with no script involved.
          </p>
          <code-block lang="html" caption="index.html — served pre-rendered" code={`<my-counter>
  <template shadowrootmode="open">
    <style>
      :host { display: block; font-family: sans-serif; }
      .count { font-size: 2rem; }
    </style>
    <p class="count">0</p>
    <button>Increment</button>
  </template>
</my-counter>`}></code-block>

          <p>
            The component itself is unchanged. There is no hydrate entry point and no
            server-versus-client branch to write:
          </p>
          <code-block lang="ts" code={`@component("my-counter")
class MyCounter extends LoomElement {
  @reactive accessor count = 0;

  update() {
    return (
      <>
        <p class="count">{this.count}</p>
        <button onClick={() => this.count++}>Increment</button>
      </>
    );
  }
}`}></code-block>
        </doc-section>

        <doc-section heading="How it works">
          <p>
            There is no hydration algorithm. That is the whole design, and it is worth being
            precise about, because it is what removes an entire class of bug.
          </p>
          <table class="api-table">
            <thead>
              <tr><th>Phase</th><th>What happens</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Parse</td>
                <td>
                  The browser sees the template and attaches a shadow root containing it.
                  The user is looking at the finished UI, and not a line of Loom has run.
                </td>
              </tr>
              <tr>
                <td>Upgrade</td>
                <td>
                  When the element is defined, <span class="ic">LoomElement</span>'s constructor
                  finds a <span class="ic">shadowRoot</span> already present and keeps it, instead
                  of calling <span class="ic">attachShadow()</span>. That is the entire
                  hydration-specific code path — one branch.
                </td>
              </tr>
              <tr>
                <td>First render</td>
                <td>
                  <span class="ic">update()</span> runs and its result is morphed against the
                  shadow root, exactly as it would be on any later render. Matching nodes are
                  left alone and the listeners and bindings attach to them.
                </td>
              </tr>
            </tbody>
          </table>

          <p class="tip">
            Because the first render is an ordinary morph and not a comparison against an
            expected tree, server markup that disagrees with <span class="ic">update()</span> is
            simply corrected. There is no mismatch warning because there is no mismatch
            check — the morph does what it always does. Stale or approximate server HTML
            degrades into a small DOM patch rather than a thrown error or a blanked component.
          </p>
        </doc-section>

        <doc-section heading="Two things that will catch you">
          <p class="caution">
            The mode must be <span class="ic">open</span>. A closed declarative shadow root is
            not exposed as <span class="ic">this.shadowRoot</span>, so Loom cannot find it, calls <span class="ic">attachShadow()</span> on an element that already has one, and the
            constructor throws. Use <span class="ic">shadowrootmode="open"</span>.
          </p>
          <p class="warning">
            Styles can ship twice. A <span class="ic">&lt;style&gt;</span> inside the template
            stays in the shadow root, and <span class="ic">@styles</span> adds a constructable
            sheet on top of it — both are live, and the adopted sheet wins on equal specificity.
            Keep the inline copy to what the first paint actually needs, and let the component
            own the rest.
          </p>
        </doc-section>

        <doc-section heading="Choosing between them">
          <p>
            The question is never "is pre-painting good" — it is whether this particular
            markup is worth putting in the initial document, which it makes larger for
            everyone.
          </p>
          <api-table
            head={["The component is", "Use", "Because"]}
            rows={[
              ["A shell, nav, or hero above the fold", <code>DSD</code>, "It is the first thing seen, and it is the same for everyone"],
              ["Below the fold", <code>@lazy</code>, "Pre-painting what nobody has scrolled to only costs bytes"],
              ["Behind a click that has not happened", <code>@lazy</code>, "Same reason, and the module can arrive during the click"],
              ["Different for every user", "Neither", "Per-user HTML cannot be cached at the edge, which was the point"],
              ["Meaningless without JavaScript", "Neither", "A pre-painted control that cannot yet be used is worse than nothing"],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="Browser support">
          <p>
            Chrome and Edge 111+, Safari 16.4+, Firefox 123+. Older browsers ignore the
            template entirely: Loom finds no shadow root, attaches one, and renders on the
            client as usual. The page still works — it just loses the early paint, which is
            the correct way for a progressive enhancement to fail.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}
