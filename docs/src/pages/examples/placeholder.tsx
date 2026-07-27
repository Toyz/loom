/**
 * Example — Placeholder Demo (LoomPlaceholder)
 *
 * Live demo: <loom-placeholder> component with RgbaPlaceholder
 */
import { LoomElement } from "@toyz/loom";
import "./components/placeholder-demo";

export default class ExamplePlaceholder extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="&lt;loom-placeholder&gt; — Placeholder Images" subtitle="Solid-color placeholder images powered by <a href=&quot;https://rgba.lol&quot; target=&quot;_blank&quot; style={{ color: &quot;var(--accent)&quot; }}>rgba.lol</a> — adjust color, size, and format in real time."></doc-header>

        <section>
          <p>Three placeholder strategies side by side, all holding their space before content arrives. Resize the window: the layout does not shift when the real images land, because the boxes were already the right size.</p>
        </section>

        <doc-section heading="Demo">
          <p>
            Pick a color, drag the sliders, and watch <span class="ic">&lt;loom-placeholder&gt;</span> render a live image
            from <span class="ic">RgbaPlaceholder</span>.
          </p>
          <doc-demo>
            <placeholder-demo></placeholder-demo>
          </doc-demo>
        </doc-section>
        <doc-section heading="What This Shows">
          <ul>
            <li><span class="ic">&lt;loom-placeholder&gt;</span> — reactive component that renders via the provider</li>
            <li><span class="ic">RgbaPlaceholder</span> — builds rgba.lol URLs (RGB and RGBA)</li>
            <li><span class="ic">PlaceholderProvider</span> — swappable via DI</li>
            <li>PNG and SVG format support</li>
          </ul>
        </doc-section>
        <doc-section heading="Provider Setup">
          <code-block lang="ts" code={`import { app } from "@toyz/loom";
import { PlaceholderProvider, RgbaPlaceholder } from "@toyz/loom-placeholder";

app.use(PlaceholderProvider, new RgbaPlaceholder());`}></code-block>
        </doc-section>
        <doc-section heading="Source">
          <source-block file="docs/src/pages/examples/components/placeholder-demo.tsx"></source-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
