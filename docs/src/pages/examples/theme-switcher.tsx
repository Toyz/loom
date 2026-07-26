/**
 * Example — Theme Switcher
 *
 * Live demo: @reactive, @mount, @styles, css, loom-icon, localStorage
 */
import { LoomElement } from "@toyz/loom";
import "./components/theme-toggle";

export default class ExampleThemeSwitcher extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Theme Switcher" subtitle="A dark/light toggle using @reactive, @styles, and loom-icon."></doc-header>

        <section>
          <p>A theme toggle done with custom properties rather than two stylesheets: one reactive field flips an attribute on the host, and the cascade does the rest. No component below re-renders when the theme changes.</p>
        </section>

        <section>
          <div class="group-header">
            <h2>Demo</h2>
          </div>
          <theme-toggle></theme-toggle>
        </section>

        <section>
          <div class="group-header">
            <h2>What This Shows</h2>
          </div>
          <ul>
            <li><span class="ic">@reactive</span> — Triggers re-render when theme changes</li>
            <li><span class="ic">@styles(sheet)</span> — Auto-adopted scoped CSS via class decorator</li>
            <li><span class="ic">@mount</span> — Reads persisted theme preference on connect</li>
            <li><span class="ic">loom-icon</span> — SVG sun/moon icons from the icon registry</li>
            <li>Persists to <span class="ic">localStorage</span> manually</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <h2>Source</h2>
          </div>
          <source-block file="docs/src/pages/examples/components/theme-toggle.tsx"></source-block>
        </section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
