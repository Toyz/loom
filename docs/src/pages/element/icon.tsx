/**
 * Icon — /element/icon
 *
 * LoomIcon built-in element documentation.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementIcon extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Icon" subtitle="A name-keyed SVG registry that renders in the light DOM, so the page cascade reaches it."></doc-header>

        <section>
          <p>Icon fonts break at arbitrary font sizes and cannot be multi-coloured; sprite sheets need a build step and a fetch. Inlining SVG per use site avoids both and costs you duplicated markup for every repeat of the same icon.</p>
          <p><span class="ic">loom-icon</span> keeps a registry: register an icon's path data once by name, then reference it by name anywhere. The element renders into the light DOM, so <span class="ic">currentColor</span> and the surrounding cascade reach it without piercing a boundary. <span class="ic">fill</span> and <span class="ic">strokeWidth</span> are separate props from <span class="ic">color</span>, so a filled icon and a stroked one can come from the same registry.</p>
        </section>

        <doc-section heading="Overview">
            <p>
              <span class="ic">&lt;loom-icon&gt;</span> is a built-in custom element for rendering inline SVG icons.
              Icons are registered by name, rendered into shadow DOM, and styled via CSS custom properties.
            </p>
          <doc-notification type="note">
            Like <span class="ic">LoomVirtual</span>, <span class="ic">LoomIcon</span> is excluded from the main barrel
            to avoid side effects. Import it explicitly to register the element:
          </doc-notification>
          <code-block lang="ts" code={`import { LoomIcon } from "@toyz/loom/element/icon";`}></code-block>
        </doc-section>
        <doc-section heading="Registering Icons">
            <p>
              Register icons with <span class="ic">LoomIcon.register()</span> for single icons or <span class="ic">LoomIcon.registerAll()</span> for batch registration:
            </p>
            <code-block lang="ts" code={`// Single icon
LoomIcon.register("home", '<path d="M3 12l9-9 9 9..." />');

// Batch registration
LoomIcon.registerAll({
  home:   '<path d="M3 12l9-9 9 9..." />',
  search: '<path d="M21 21l-6-6m2-5a7 7 0 11-14..." />',
  close:  '<path d="M18 6L6 18M6 6l12 12" />',
});`}></code-block>
          <doc-notification type="note">
            Register icons early in your app's entry point — before any component that uses{" "}
            <span class="ic">&lt;loom-icon&gt;</span> renders.
          </doc-notification>
        </doc-section>
        <doc-section heading="Usage">
            <p>Use the element in JSX or HTML with the <span class="ic">name</span> attribute:</p>
            <code-block lang="ts" code={`// In JSX
<loom-icon name="home" size={20} color="var(--text-muted)"></loom-icon>

// In HTML
<loom-icon name="search" size="16" color="#888"></loom-icon>`}></code-block>
        </doc-section>
        <doc-section heading="API">
          <api-table
            head={["Attribute / Property", "Type", "Description"]}
            rows={[
              [<code>name</code>, "string", "Name of the registered icon to render"],
              [<code>size</code>, "number", "Width and height in pixels (default: 24)"],
              [<code>color</code>, "string", "CSS color for the icon (default: currentColor)"],
            ]}
          ></api-table>
        </doc-section>
        <doc-section heading="Static Methods">
          <api-table
            head={["Method", "Description"]}
            rows={[
              [<code>LoomIcon.register(name, svg)</code>, "Register a single icon by name"],
              [<code>LoomIcon.registerAll(map)</code>, "Register multiple icons at once"],
            ]}
          ></api-table>
        </doc-section>
        <doc-section heading="IconResolver">
            <p>
              For external icon packs (Heroicons, Lucide, etc.), register an <span class="ic">IconResolver</span> via DI.
              The resolver is tried <strong>first</strong> — if it returns <span class="ic">null</span>, the static registry is used as fallback.
              If no resolver is registered, only the static registry is used (backward compatible).
            </p>
          <code-block lang="ts" code={RESOLVER_EXAMPLE}></code-block>
          <doc-notification type="note">
            <span class="ic">IconResolver</span> is optional. Existing apps using <span class="ic">LoomIcon.register()</span> continue
            to work without any changes.
          </doc-notification>
        </doc-section>
        <doc-section heading="Styling">
            <p>
              Icons inherit <span class="ic">currentColor</span> by default, so they respond to the parent's
              text color. Override with the <span class="ic">color</span> attribute or CSS:
            </p>
            <code-block lang="ts" code={`/* Icons inherit text color */
.nav-item { color: #888; }
.nav-item:hover { color: #fff; }

/* Or set explicitly */
<loom-icon name="bolt" color="var(--text-muted)"></loom-icon>`}></code-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}

const RESOLVER_EXAMPLE = `import { IconResolver } from "@toyz/loom/element/icon";
import { app } from "@toyz/loom";

// Import heroicons SVG content (e.g. via vite ?raw imports)
import ArrowRight from "@heroicons/24/outline/arrow-right.svg?raw";
import Check from "@heroicons/24/outline/check.svg?raw";

// Build a map of icon name → SVG inner content
const heroicons: Record<string, string> = {
  "arrow-right": ArrowRight,
  "check": Check,
};

// Create a resolver that extracts SVG inner content
class HeroIconResolver extends IconResolver {
  resolve(name: string): string | null {
    const raw = heroicons[name];
    if (!raw) return null; // fall back to static registry

    // Extract content between <svg> tags
    const match = raw.match(/<svg[^>]*>(.*)<\\/svg>/s);
    return match?.[1] ?? null;
  }
}

// Register before app.start()
app.use(IconResolver, new HeroIconResolver());

// Now both work:
// <loom-icon name="arrow-right" />   → resolved by HeroIconResolver
// <loom-icon name="home" />          → resolver returns null → static registry`;
