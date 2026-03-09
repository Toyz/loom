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
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Demo</h2>
          </div>
          <p>
            Pick a color, drag the sliders, and watch{" "}
            <span class="ic">&lt;loom-placeholder&gt;</span> render a live image
            from <span class="ic">RgbaPlaceholder</span>.
          </p>
          <placeholder-demo></placeholder-demo>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="list" size={20} color="var(--accent)"></loom-icon>
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">&lt;loom-placeholder&gt;</span> — reactive component that renders via the provider</li>
            <li><span class="ic">RgbaPlaceholder</span> — builds rgba.lol URLs (RGB and RGBA)</li>
            <li><span class="ic">PlaceholderProvider</span> — swappable via DI</li>
            <li>PNG and SVG format support</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="clipboard" size={20} color="var(--accent)"></loom-icon>
            <h2>Provider Setup</h2>
          </div>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";
import { PlaceholderProvider, RgbaPlaceholder } from "@toyz/loom-placeholder";

app.use(PlaceholderProvider, new RgbaPlaceholder());`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/placeholder-demo.tsx"></source-block>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
