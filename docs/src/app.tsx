/**
 * Loom Docs — App Shell
 */

import { LoomElement, component, reactive, on, css, mount } from "@toyz/loom";
import { LoomLink, RouteChanged } from "@toyz/loom/router";
import { docStyles } from "./styles/doc-page";

interface NavItem { label: string; to: string; icon: string }
interface NavSection { title: string; items: NavItem[] }

const sections: NavSection[] = [
  {
    title: "Guides",
    items: [
      { label: "Getting Started", to: "/guides/getting-started", icon: "book" },
      { label: "Your First App",  to: "/guides/your-first-app",  icon: "sparkles" },
    ],
  },
  {
    title: "Core",
    items: [
      { label: "LoomElement",      to: "/core/element",   icon: "cube" },
      { label: "Reactive State",   to: "/core/reactive",  icon: "bolt" },
      { label: "Event Bus",        to: "/core/events",    icon: "broadcast" },
      { label: "JSX & Morphing",   to: "/core/jsx",       icon: "code" },
      { label: "Storage",          to: "/core/storage",   icon: "database" },
    ],
  },
  {
    title: "Features",
    items: [
      { label: "Decorators",       to: "/features/decorators",    icon: "hash" },
      { label: "Router",           to: "/features/router",        icon: "compass" },
      { label: "Virtual List",     to: "/features/virtual-list",  icon: "list" },
      { label: "App & DI",         to: "/features/di",            icon: "box" },
    ],
  },
];

const styles = css`
  :host {
    display: flex;
    min-height: 100vh;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* ─────────── Sidebar ─────────── */

  aside {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    background: var(--bg-surface, #121218);
    border-right: 1px solid var(--border-subtle, #1e1e2a);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 100;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.06) transparent;
  }

  /* ── Brand ── */

  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 32px 28px 28px;
  }
  .brand-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--accent, #818cf8), var(--rose, #f472b6));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(129, 140, 248, 0.25);
  }
  .brand-mark svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: #fff;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .brand h1 {
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: -0.025em;
    color: var(--text-primary, #e8e8f0);
    margin: 0;
  }
  .brand-version {
    margin-left: auto;
    font-size: 0.625rem;
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    color: var(--text-muted, #5e5e74);
    border: 1px solid var(--border-subtle, #1e1e2a);
    padding: 2px 8px;
    border-radius: 5px;
    white-space: nowrap;
  }

  /* ── Navigation ── */

  nav {
    flex: 1;
    padding: 12px 0 40px;
  }

  /* Home link */
  .home-item {
    margin: 0 16px 16px;
  }
  .home-item loom-link::part(anchor) {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary, #9898ad);
    text-decoration: none;
    transition: background 0.18s ease, color 0.18s ease;
  }
  .home-item loom-link::part(anchor):hover {
    background: var(--bg-hover, #22222e);
    color: var(--text-primary, #e8e8f0);
  }

  /* Section */
  .section {
    margin-top: 12px;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 28px 8px;
    cursor: pointer;
    user-select: none;
  }
  .section-title {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted, #5e5e74);
    transition: color 0.15s;
  }
  .section-header:hover .section-title {
    color: var(--text-secondary, #9898ad);
  }
  .section-chevron {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: var(--text-muted, #5e5e74);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }
  .section.open .section-chevron {
    transform: rotate(90deg);
  }

  /* Links container */
  .section-links {
    overflow: hidden;
    max-height: 0;
    transition: max-height 0.25s ease;
    padding: 0 12px;
  }
  .section.open .section-links {
    max-height: 500px;
    padding-top: 4px;
  }

  /* Individual nav link */
  .nav-link {
    display: block;
    margin: 2px 0;
    border-radius: 10px;
    position: relative;
  }
  .nav-link loom-link::part(anchor) {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 0.8125rem;
    font-weight: 450;
    color: var(--text-secondary, #9898ad);
    text-decoration: none;
    transition: background 0.18s ease, color 0.18s ease;
  }
  .nav-link loom-link::part(anchor):hover {
    background: var(--bg-hover, #22222e);
    color: var(--text-primary, #e8e8f0);
  }
  .nav-link.active loom-link::part(anchor) {
    background: rgba(129, 140, 248, 0.08);
    color: var(--accent, #818cf8);
    font-weight: 550;
  }
  .nav-link.active {
    position: relative;
  }
  .nav-link.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 6px;
    bottom: 6px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: var(--accent, #818cf8);
  }

  /* Icon inside link */
  .nav-link loom-icon,
  .home-item loom-icon {
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.18s ease;
  }
  .nav-link.active loom-icon {
    opacity: 1;
  }
  .nav-link:hover loom-icon {
    opacity: 0.75;
  }

  /* ─────────── Main Content ─────────── */

  main {
    margin-left: 280px;
    flex: 1;
    min-height: 100vh;
  }
  .page {
    max-width: 820px;
    margin: 0 auto;
    padding: 56px 48px 80px;
  }
  loom-outlet {
    display: block;
  }
`;

@component("docs-app")
export class DocsApp extends LoomElement {

  @reactive private currentPath: string = "/";
  @reactive private openSections = new Set(["Guides", "Core", "Features"]);

  @mount
  setup() {
    this.shadow.adoptedStyleSheets = [styles, docStyles];
  }

  @on(RouteChanged)
  onRoute(e: RouteChanged) {
    this.currentPath = e.path;
    for (const s of sections) {
      if (s.items.some(i => e.path.startsWith(i.to))) {
        this.openSections.add(s.title);
      }
    }
    this.scheduleUpdate();
  }

  toggleSection(title: string) {
    if (this.openSections.has(title)) this.openSections.delete(title);
    else this.openSections.add(title);
    this.scheduleUpdate();
  }

  isActive(to: string): boolean {
    return this.currentPath === to || this.currentPath.startsWith(to + "/");
  }

  update() {
    return (
      <div>
        <aside>
          <div class="brand">
            <div class="brand-mark">
              <svg viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1>Loom</h1>
            <span class="brand-version">{`v${__LOOM_VERSION__}`}</span>
          </div>

          <nav>
            <div class="home-item">
              <loom-link to="/">
                <loom-icon name="home" size="18"></loom-icon>
                Home
              </loom-link>
            </div>

            {sections.map(s => (
              <div class={`section ${this.openSections.has(s.title) ? "open" : ""}`}>
                <div class="section-header" onClick={() => this.toggleSection(s.title)}>
                  <svg class="section-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
                  <span class="section-title">{s.title}</span>
                </div>
                <div class="section-links">
                  {s.items.map(item => (
                    <div class={`nav-link ${this.isActive(item.to) ? 'active' : ''}`}>
                      <loom-link to={item.to}>
                        <loom-icon name={item.icon} size="18"></loom-icon>
                        {item.label}
                      </loom-link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main>
          <div class="page">
            <loom-outlet styles={[docStyles]}></loom-outlet>
          </div>
        </main>
      </div>
    );
  }
}
