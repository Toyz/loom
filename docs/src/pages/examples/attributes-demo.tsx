/**
 * Example — Attributes (directives)
 *
 * Live demo: @attribute, LoomAttribute, @prop args, @observer, portal update()
 */
import { LoomElement } from "@toyz/loom";
import "./components/attributes-showcase";

export default class ExampleAttributes extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Attributes" subtitle="Custom attribute controllers — behavior and rendered components attached to any element."></doc-header>

        <section>
          <p>Attribute controllers attached to markup that knows nothing about them. The tooltip, the ripple and the counter below are plain elements with an attribute added — no wrapper component, no custom tag. Inspect them and you will find the original markup unchanged.</p>
        </section>

        <doc-section heading="Demo">
          <attributes-showcase></attributes-showcase>
        </doc-section>
        <doc-section heading="What This Shows">
          <ul>
            <li><span class="ic">@attribute("demo-autofocus")</span> — behavior-only controller focuses its host on connect</li>
            <li><span class="ic">demo-reveal={"{fn}"}</span> — a function arg read via <span class="ic">this.arg</span>, fired by <span class="ic">@observer("intersection")</span> targeting the host</li>
            <li><span class="ic">demo-tooltip={"{{ text }}"}</span> — <span class="ic">@prop</span> object args + <span class="ic">update()</span> rendering a portal bubble into <span class="ic">document.body</span></li>
            <li><span class="ic">@styles</span> — scoped CSS adopted into the controller's own render shadow root</li>
          </ul>
        </doc-section>
        <doc-section heading="Source">
          <source-block file="docs/src/pages/examples/components/attributes-showcase.tsx"></source-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
