/**
 * Theme Toggle — A dark/light mode switcher with persistence.
 *
 * Demonstrates: @component, @reactive, @mount, @styles, css, loom-icon
 */
import { LoomElement, component, reactive, css, styles, mount } from "@toyz/loom";
import { t } from "../../../tokens";

const sheet = css`
  :host { display: block; }
  .toggle {
    display: flex; align-items: center; gap: 1rem;
    padding: 1.25rem 1.5rem; border-radius: 0;
    background: ${t.surface2}; border: 1px solid ${t.border};
    cursor: pointer; user-select: none;
    transition: background 0.2s, border-color 0.2s;
  }
  .toggle:hover { border-color: ${t.accent}; }
  .icon-wrap {
    width: 40px; height: 40px; border-radius: 0;
    display: grid; place-items: center;
    transition: background 0.2s;
  }
  .icon-wrap.dark { background: ${t.groundRaised}; }
  .icon-wrap.light { background: var(--card); }
  .info { flex: 1; }
  .label { font-size: 1.05rem; font-weight: 500; color: ${t.text}; }
  .hint { color: ${t.textMuted}; font-size: 0.8rem; margin-top: 0.15rem; }
  .badge {
    padding: 0.2rem 0.6rem; border-radius: 0;
    font-size: 0.75rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .badge.dark { background: ${t.groundRaised}; color: ${t.thread}; }
  .badge.light { background: var(--card); color: ${t.warn}; }
`;

@component("theme-toggle")
@styles(sheet)
export class ThemeToggle extends LoomElement {
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
                     color={isDark ? t.$value.thread : t.$value.warn}></loom-icon>
        </div>
        <div class="info">
          <div class="label">{isDark ? "Dark Mode" : "Light Mode"}</div>
          <div class="hint">Click to switch · Persists to localStorage</div>
        </div>
        <span class={"badge " + this.currentTheme}>{this.currentTheme}</span>
      </div>
    );
  }
}
