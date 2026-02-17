/**
 * Theme Toggle — A dark/light mode switcher with persistence.
 *
 * Demonstrates: @component, @reactive, @mount, @styles, css, loom-icon
 */
import { LoomElement, component, reactive, css, styles, mount } from "@toyz/loom";

const sheet = css`
  :host { display: block; }
  .toggle {
    display: flex; align-items: center; gap: 1rem;
    padding: 1.25rem 1.5rem; border-radius: 12px;
    background: var(--surface-2, #1e1e2e); border: 1px solid var(--border, #333);
    cursor: pointer; user-select: none;
    transition: background 0.2s, border-color 0.2s;
  }
  .toggle:hover { border-color: var(--accent, #a78bfa); }
  .icon-wrap {
    width: 40px; height: 40px; border-radius: 10px;
    display: grid; place-items: center;
    transition: background 0.2s;
  }
  .icon-wrap.dark { background: #312e81; }
  .icon-wrap.light { background: #fef3c7; }
  .info { flex: 1; }
  .label { font-size: 1.05rem; font-weight: 500; color: var(--text, #e0e0e0); }
  .hint { color: var(--text-muted, #888); font-size: 0.8rem; margin-top: 0.15rem; }
  .badge {
    padding: 0.2rem 0.6rem; border-radius: 999px;
    font-size: 0.75rem; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .badge.dark { background: #312e81; color: #a78bfa; }
  .badge.light { background: #fef3c7; color: #92400e; }
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
                     color={isDark ? "#a78bfa" : "#92400e"}></loom-icon>
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
