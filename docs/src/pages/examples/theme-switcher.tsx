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
        <h1>Theme Switcher</h1>
        <p class="subtitle">
          A dark/light toggle using <span class="ic">@reactive</span>,{" "}
          <span class="ic">@styles</span>, and <span class="ic">loom-icon</span>.
        </p>

        <section>
          <h2>Demo</h2>
          <theme-toggle></theme-toggle>
        </section>

        <section>
          <h2>What This Shows</h2>
          <ul>
            <li><span class="ic">@reactive</span> — Triggers re-render when theme changes</li>
            <li><span class="ic">@styles(sheet)</span> — Auto-adopted scoped CSS via class decorator</li>
            <li><span class="ic">@mount</span> — Reads persisted theme preference on connect</li>
            <li><span class="ic">loom-icon</span> — SVG sun/moon icons from the icon registry</li>
            <li>Persists to <span class="ic">localStorage</span> manually</li>
          </ul>
        </section>

        <section>
          <h2>Source</h2>
          <code-block lang="ts" code={SOURCE}></code-block>
        </section>
      </div>
    );
  }
}

const SOURCE = `import { LoomElement, component, reactive, css, styles, mount } from "@toyz/loom";

const sheet = css\`
  :host { display: block; }
  .toggle {
    display: flex; align-items: center; gap: 1rem;
    padding: 1.25rem 1.5rem; border-radius: 12px;
    background: var(--surface-2); border: 1px solid var(--border);
    cursor: pointer; user-select: none;
  }
  .icon-wrap {
    width: 40px; height: 40px; border-radius: 10px;
    display: grid; place-items: center;
  }
  .icon-wrap.dark { background: #312e81; }
  .icon-wrap.light { background: #fef3c7; }
\`;

@component("theme-toggle")
@styles(sheet)
class ThemeToggle extends LoomElement {
  @reactive accessor currentTheme: "light" | "dark" = "dark";

  @mount
  onMount() {
    this.currentTheme =
      (localStorage.getItem("example-theme") as "light" | "dark") ?? "dark";
  }

  toggle() {
    this.currentTheme = this.currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("example-theme", this.currentTheme);
  }

  update() {
    const isDark = this.currentTheme === "dark";
    return (
      <div class="toggle" onClick={() => this.toggle()}>
        <div class={"icon-wrap " + this.currentTheme}>
          <loom-icon name={isDark ? "moon" : "sun"} size={22}
                     color={isDark ? "#a78bfa" : "#92400e"} />
        </div>
        <div class="info">
          <div class="label">{isDark ? "Dark Mode" : "Light Mode"}</div>
          <div class="hint">Click to switch · Persists to localStorage</div>
        </div>
      </div>
    );
  }
}`;
