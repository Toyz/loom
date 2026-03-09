/**
 * Packages — Placeholder Overview  /packages/placeholder-overview
 *
 * Package intro, install, <loom-placeholder> component, RgbaPlaceholder provider.
 */
import { LoomElement } from "@toyz/loom";

export default class PagePlaceholderOverview extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="@toyz/loom-placeholder" subtitle="Placeholder components for Loom — pluggable providers, ships with rgba.lol."></doc-header>

        <section>
          <div class="group-header">
            <loom-icon name="download" size={20} color="var(--emerald)"></loom-icon>
            <h2>Install</h2>
          </div>
          <code-block lang="bash" code={`npm install @toyz/loom-placeholder`}></code-block>
          <p>
            <span class="ic">@toyz/loom</span> is the only dependency.
          </p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <p>
            LoomPlaceholder provides a <span class="ic">&lt;loom-placeholder&gt;</span> component
            powered by a swappable <span class="ic">PlaceholderProvider</span>.
          </p>
          <ul>
            <li>Register a provider via DI — ships with <span class="ic">RgbaPlaceholder</span> backed by <a href="https://rgba.lol" target="_blank">rgba.lol</a></li>
            <li><span class="ic">&lt;loom-placeholder&gt;</span> renders a solid-color image using the registered provider</li>
            <li>Swap providers without changing any component code</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>1. Register a Provider</h2>
          </div>
          <code-block lang="ts" code={`import { app } from "@toyz/loom";
import { PlaceholderProvider, RgbaPlaceholder } from "@toyz/loom-placeholder";

app.use(PlaceholderProvider, new RgbaPlaceholder());`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>2. Use the Component</h2>
          </div>
          <code-block lang="tsx" code={`import "@toyz/loom-placeholder"; // registers <loom-placeholder>

// RGB placeholder — solid red 300×200
<loom-placeholder color="ff0000" width={300} height={200} />

// RGBA with alpha — semi-transparent green 64×64
<loom-placeholder color="00ff0080" width={64} height={64} />

// SVG format
<loom-placeholder color="3344ff" width={100} height={100} format="svg" />`}></code-block>
          <p>
            The <span class="ic">color</span> prop accepts hex without <span class="ic">#</span>:
          </p>
          <ul>
            <li><strong>6 chars</strong> — RGB (e.g. <span class="ic">"ff00aa"</span>)</li>
            <li><strong>8 chars</strong> — RGBA (e.g. <span class="ic">"ff00aa80"</span>)</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--cyan)"></loom-icon>
            <h2>3. Use the Provider Directly</h2>
          </div>
          <code-block lang="ts" code={`const provider = new RgbaPlaceholder();

provider.rgba({ r: 255, g: 0, b: 170, width: 300, height: 200 });
// → "https://rgba.lol/ff/00/aa/300x200.png"

provider.rgba({ r: 255, g: 0, b: 170, a: 128, width: 64, height: 64, format: "svg" });
// → "https://rgba.lol/ff/00/aa/80/64x64.svg"`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="image" size={20} color="var(--cyan)"></loom-icon>
            <h2>Props</h2>
          </div>
          <table class="api-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><span class="ic">color</span></td><td>string</td><td>"cccccc"</td><td>Hex color (6 or 8 chars, no #)</td></tr>
              <tr><td><span class="ic">width</span></td><td>number</td><td>100</td><td>Width in pixels</td></tr>
              <tr><td><span class="ic">height</span></td><td>number</td><td>100</td><td>Height in pixels</td></tr>
              <tr><td><span class="ic">format</span></td><td>"png" | "svg"</td><td>"png"</td><td>Image format</td></tr>
              <tr><td><span class="ic">alt</span></td><td>string</td><td>"placeholder"</td><td>Alt text</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--cyan)"></loom-icon>
            <h2>Custom Providers</h2>
          </div>
          <p>
            Swap to any placeholder backend with one DI line:
          </p>
          <code-block lang="ts" code={`class MyPlaceholderProvider extends PlaceholderProvider {
  url(options: PlaceholderOptions): string {
    return \`https://via.placeholder.com/\${options.width}x\${options.height}\`;
  }
}

app.use(PlaceholderProvider, new MyPlaceholderProvider());`}></code-block>
          <p>
            Every <span class="ic">&lt;loom-placeholder&gt;</span> in the app uses the new provider.
            No component changes.
          </p>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
