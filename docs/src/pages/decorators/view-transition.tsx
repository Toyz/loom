/**
 * Decorators — View Transitions  /decorators/view-transition
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorViewTransition extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="View Transitions"
          subtitle="Animate a render by handing the browser the one moment the DOM changes."
        ></doc-header>

        <section>
          <p><span class="ic">document.startViewTransition(mutate)</span> snapshots the page, runs your mutation, snapshots again, and cross-fades the difference. What it needs in return is one synchronous DOM mutation between the two snapshots.</p>
          <p>That is what Loom's renderer already is. <span class="ic">morph</span> has a single entry point and applies the whole update in one pass, so there is an exact moment to hand over. A framework that commits through a chunked, interruptible scheduler has to work to produce the same guarantee; here it falls out of the architecture.</p>
          <punch-matrix
            columns="WRAPPED IN A TRANSITION,STRUCTURAL,COSTS A PAGE SNAPSHOT"
            rows={[
              { name: "full render", punches: "WRAPPED IN A TRANSITION,STRUCTURAL,COSTS A PAGE SNAPSHOT", note: "Nodes added, removed or reordered" },
              { name: "fast patch", punches: "", note: "A text node or attribute written in place" },
              { name: "first render", punches: "", note: "An append into an empty root — nothing to fade from" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="@viewTransition">
          <api-entry sig="@viewTransition">
            <p>Wraps this component's full renders. Bare, or with options.</p>
            <code-block lang="ts" code={BASIC}></code-block>
          </api-entry>
          <api-table
            head={["Option", "Type", "Description"]}
            rows={[
              [<code>respectReducedMotion</code>, "boolean", <>Skip the animation under <code>prefers-reduced-motion</code> (default <code>true</code>)</>],
              [<code>types</code>, "string[]", <>Transition types, matched by <code>:active-view-transition-type(name)</code></>],
            ]}
          ></api-table>
          <p class="note">
            Only full renders are wrapped. A fast patch writes a text node or an attribute in
            place — not the structural change view transitions exist to animate — and
            snapshotting the whole page to cross-fade a counter would cost far more than it
            shows.
          </p>
        </doc-section>

        <doc-section heading="Naming the parts that move">
          <p>
            By default the whole page cross-fades. To animate an element from its old position
            to its new one, give it a <span class="ic">view-transition-name</span>.
          </p>
          <code-block lang="tsx" code={NAMED}></code-block>
          <p class="caution">
            A name must be unique across the document while the transition runs. Two elements
            sharing one makes the browser skip the transition entirely rather than report an
            error — which is a hard thing to notice, since the result looks exactly like the
            feature not being supported. Deriving the name from the same stable key you use for
            list identity is the reliable way to get it right.
          </p>
        </doc-section>

        <doc-section heading="Imperative use">
          <p>
            <span class="ic">startViewTransition</span> wraps any mutation, not just a render —
            useful for a route change or a DOM edit outside a component.
          </p>
          <code-block lang="ts" code={IMPERATIVE}></code-block>
          <p class="tip">
            The mutation runs exactly once whether or not the browser supports transitions,
            synchronously in the fallback. Callers never need two code paths.
          </p>
        </doc-section>

        <doc-section heading="Browser support">
          <p>
            Chrome and Edge 111+, Safari 18+. Firefox has not shipped it. Where it is missing
            the mutation happens immediately and the page updates without animation, which is
            the correct way for decoration to fail. <span class="ic">supportsViewTransitions()</span> reports
            it if you need to branch.
          </p>
          <p class="note">
            Under <span class="ic">prefers-reduced-motion: reduce</span> the transition is
            skipped and the DOM change still happens. That is the whole of the accessibility
            story for it, and it is on by default.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}

const BASIC = `import { component, viewTransition } from "@toyz/loom";

@component("my-list")
@viewTransition
class MyList extends LoomElement { }

@component("my-page")
@viewTransition({ types: ["slide"] })
class MyPage extends LoomElement { }`;

const NAMED = `update() {
  return (
    <ul>
      {this.items.map((item) => (
        <li key={item.id} style={\`view-transition-name: item-\${item.id}\`}>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/* CSS:
   ::view-transition-old(*) { animation-duration: 200ms; }
   ::view-transition-new(*) { animation-duration: 200ms; }
*/`;

const IMPERATIVE = `import { startViewTransition } from "@toyz/loom";

const handle = startViewTransition(() => {
  router.go("/next");
});

await handle.finished;   // resolves when the animation ends
handle.skipTransition(); // or abandon it, keeping the DOM change`;
