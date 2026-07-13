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
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Demo</h2>
          </div>
          <attributes-showcase></attributes-showcase>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--accent)"></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">@attribute("demo-autofocus")</span> — behavior-only controller focuses its host on connect</li>
            <li><span class="ic">demo-reveal={"{fn}"}</span> — a function arg read via <span class="ic">this.arg</span>, fired by <span class="ic">@observer("intersection")</span> targeting the host</li>
            <li><span class="ic">demo-tooltip={"{{ text }}"}</span> — <span class="ic">@prop</span> object args + <span class="ic">update()</span> rendering a portal bubble into <span class="ic">document.body</span></li>
            <li><span class="ic">@styles</span> — scoped CSS adopted into the controller's own render shadow root</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/attributes-showcase.tsx"></source-block>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
