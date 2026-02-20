/**
 * Loom Docs — App Shell
 */

import { LoomElement, component, reactive, on, css, mount, query } from "@toyz/loom";
import { LoomLink, RouteChanged } from "@toyz/loom/router";
import { docStyles } from "./styles/doc-page";
import { scrollbar } from "./shared/scrollbar";
import "./components/doc-search";

interface NavItem { label: string; to: string; icon: string; divider?: string; dividerVersion?: string }
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
    title: "Element",
    items: [
      { label: "Overview",        to: "/element/overview",       icon: "cube" },
      { label: "Lifecycle",       to: "/element/lifecycle",      icon: "refresh" },
      { label: "Timing",          to: "/element/timing",         icon: "zap" },
      { label: "CSS",             to: "/element/css",            icon: "palette" },
      { label: "DOM Queries",     to: "/element/queries",        icon: "search" },
      { label: "JSX & Morphing",  to: "/element/jsx",            icon: "code" },
      { label: "Decorators",      to: "/element/decorators",     icon: "hash" },
      { label: "Lazy Loading",    to: "/element/lazy",           icon: "download" },
      { label: "Forms",           to: "/element/forms",          icon: "clipboard" },
      { label: "Virtual List",    to: "/element/virtual-list",   icon: "list",      divider: "Built-ins" },
      { label: "Icon",            to: "/element/icon",           icon: "star" },
      { label: "Canvas",          to: "/element/canvas",         icon: "canvas" },
      { label: "Image",           to: "/element/image",          icon: "image" },
    ],
  },
  {
    title: "Store",
    items: [
      { label: "Overview",    to: "/store/overview",          icon: "archive" },
      { label: "Reactive",    to: "/store/reactive",          icon: "bolt" },
      { label: "Decorator",       to: "/store/store-decorator", icon: "package" },
      { label: "Storage",     to: "/store/storage",           icon: "database" },
      { label: "Patterns",    to: "/store/patterns",          icon: "layers" },
      { label: "Fetch",       to: "/store/api",               icon: "zap" },
    ],
  },
  {
    title: "DI & Services",
    items: [
      { label: "Overview",    to: "/di/overview",     icon: "box" },
      { label: "Decorators",  to: "/di/decorators",   icon: "hash" },
    ],
  },
  {
    title: "Router",
    items: [
      { label: "Overview",        to: "/router/overview",         icon: "compass" },
      { label: "Routes",          to: "/router/routes",           icon: "map" },
      { label: "Groups",          to: "/router/groups",           icon: "layers" },
      { label: "Guards",          to: "/router/guards",           icon: "shield" },
      { label: "Navigation",      to: "/router/navigation",       icon: "arrow-right" },
      { label: "Lifecycle",       to: "/router/route-lifecycle",  icon: "refresh" },
      { label: "Decorators",      to: "/router/decorators",       icon: "hash" },
    ],
  },
  {
    title: "Decorators",
    items: [
      { label: "Overview",     to: "/decorators/overview",    icon: "hash" },
      { label: "Events",       to: "/decorators/events",      icon: "broadcast" },
      { label: "Transform",    to: "/decorators/transform",   icon: "refresh" },
    ],
  },
  {
    title: "Packages",
    items: [
      { label: "Overview",    to: "/packages/rpc-overview",    icon: "package",     divider: "RPC", dividerVersion: `v${__LOOM_RPC_VERSION__}` },
      { label: "Queries",     to: "/packages/rpc-queries",     icon: "download" },
      { label: "Mutations",   to: "/packages/rpc-mutations",   icon: "edit" },
      { label: "Transports",  to: "/packages/rpc-transports",  icon: "layers" },
      { label: "Testing",     to: "/packages/rpc-testing",     icon: "check" },
      { label: "Demo",        to: "/packages/rpc-demo",        icon: "zap" },
      { label: "Overview",    to: "/packages/create-loom",     icon: "package",     divider: "Create Loom", dividerVersion: `v${__CREATE_LOOM_VERSION__}` },
    ],
  },
  {
    title: "Examples",
    items: [
      { label: "Clock",           to: "/examples/clock",          icon: "zap" },
      { label: "Todo List",       to: "/examples/todo",           icon: "check" },
      { label: "Theme Switcher",  to: "/examples/theme-switcher", icon: "eye" },
      { label: "Contact Form",    to: "/examples/form",            icon: "edit" },
      { label: "Fetch",          to: "/examples/api",             icon: "download" },
      { label: "Virtual List",    to: "/examples/virtual-list-demo", icon: "list" },
      { label: "Timing",          to: "/examples/timing-demo",   icon: "clock" },
      { label: "Stress Test",     to: "/examples/stress-test",   icon: "zap" },
      { label: "Canvas Game",     to: "/examples/canvas-game",   icon: "canvas" },
      { label: "Image Gallery",   to: "/examples/image-gallery", icon: "image" },
    ],
  },
];

const styles = css`
  :host {
    display: flex;
    min-height: 100vh;
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  /* ─────────── Mobile Header (mobile only) ─────────── */

  .mobile-header {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 150;
    height: 56px;
    background: var(--bg-surface, #121218);
    border-bottom: 1px solid var(--border-subtle, #1e1e2a);
    align-items: center;
    padding: 0 16px;
    gap: 12px;
  }
  .mobile-header .brand-mark {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--accent, #818cf8), var(--rose, #f472b6));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 2px 6px rgba(129, 140, 248, 0.2);
  }
  .mobile-header .brand-mark svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: #fff;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .mobile-header h1 {
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary, #e8e8f0);
    margin: 0;
    flex: 1;
  }
  .hamburger {
    display: none;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary, #9898ad);
    cursor: pointer;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s ease, color 0.15s ease;
    flex-shrink: 0;
  }
  .hamburger:hover {
    background: var(--bg-hover, #22222e);
    color: var(--text-primary, #e8e8f0);
  }
  .hamburger svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }

  /* ── Sidebar close button ── */

  .sidebar-close {
    display: none;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted, #5e5e74);
    cursor: pointer;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-left: auto;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .sidebar-close:hover {
    background: var(--bg-hover, #22222e);
    color: var(--text-primary, #e8e8f0);
  }
  .sidebar-close svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }

  /* ─────────── Backdrop (mobile only) ─────────── */

  .backdrop {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 0.25s ease;
    pointer-events: none;
  }
  .backdrop.visible {
    opacity: 1;
    pointer-events: auto;
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
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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

  /* ── Search Bar ── */

  .search-trigger {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 16px 8px;
    padding: 8px 12px;
    border: 1px solid var(--border-subtle, #1e1e2a);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.02);
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .search-trigger:hover {
    background: var(--bg-hover, #22222e);
    border-color: rgba(129, 140, 248, 0.3);
  }
  .search-trigger loom-icon {
    flex-shrink: 0;
    color: var(--text-muted, #5e5e74);
  }
  .search-trigger-text {
    flex: 1;
    font-size: 0.8rem;
    color: var(--text-muted, #5e5e74);
  }
  .search-trigger-kbd {
    font-size: 0.6rem;
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    color: var(--text-muted, #5e5e74);
    border: 1px solid var(--border-subtle, #1e1e2a);
    padding: 2px 5px;
    border-radius: 4px;
    opacity: 0.7;
  }

  /* ── Navigation ── */

  nav {
    flex: 1;
    padding: 12px 0 40px;
  }

  /* Home link */
  .home-item {
    margin: 0 16px 4px;
  }

  /* Standalone top-level nav links (outside collapsible sections) */
  .nav-link.standalone {
    margin: 0 16px 12px;
  }
  .nav-link.standalone loom-link::part(anchor) {
    font-size: 0.875rem;
    font-weight: 500;
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
    max-height: 800px;
    padding-top: 4px;
  }

  /* Nav sub-group divider (e.g. "Built-ins") */
  .nav-divider {
    font-size: 0.5625rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted, #5e5e74);
    opacity: 0.6;
    padding: 6px 18px 2px;
    margin-top: 2px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .divider-version {
    font-size: 0.5rem;
    font-family: var(--font-mono, "JetBrains Mono", monospace);
    color: var(--text-muted, #5e5e74);
    border: 1px solid var(--border-subtle, #1e1e2a);
    padding: 1px 5px;
    border-radius: 4px;
    text-transform: none;
    letter-spacing: 0;
    opacity: 1;
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

  /* ─────────── Mobile ─────────── */

  @media (max-width: 768px) {
    .mobile-header {
      display: flex;
    }
    .hamburger {
      display: flex;
    }
    .sidebar-close {
      display: flex;
    }

    .backdrop {
      display: block;
    }

    aside {
      transform: translateX(-100%);
      box-shadow: 4px 0 32px rgba(0, 0, 0, 0.5);
      z-index: 200;
    }
    aside.open {
      transform: translateX(0);
    }

    .backdrop.visible {
      z-index: 160;
    }

    /* Hide the version badge in sidebar on mobile (already in header) */
    aside .brand-version {
      display: none;
    }

    main {
      margin-left: 0;
      padding-top: 56px; /* below mobile header */
    }
    .page {
      padding: 24px 20px 60px;
    }
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    aside {
      width: 240px;
    }
    main {
      margin-left: 240px;
    }
    .page {
      padding: 48px 32px 60px;
    }
  }
`;

@component("docs-app")
export class DocsApp extends LoomElement {

  @reactive accessor currentPath: string = "/";
  @reactive accessor openSections = new Set(sections.map(s => s.title));
  @reactive accessor sidebarOpen = false;

  @mount
  setup() {
    this.shadow.adoptedStyleSheets = [styles, docStyles];
  }

  @on(RouteChanged)
  onRoute(e: RouteChanged) {
    this.currentPath = e.path;
    this.sidebarOpen = false; // auto-close on mobile nav
    for (const s of sections) {
      if (s.items.some(i => e.path.startsWith(i.to))) {
        this.openSections.add(s.title);
      }
    }
    this.scheduleUpdate();
  }

  toggleSection(title: string) {
    const next = new Set(this.openSections);
    if (next.has(title)) next.delete(title);
    else next.add(title);
    this.openSections = next;
  }

  isActive(to: string): boolean {
    return this.currentPath === to || this.currentPath.startsWith(to + "/");
  }

  openSearch() {
    const search = this.shadow.querySelector("doc-search") as any;
    search?.open();
  }

  update() {
    return (
      <div>
        <header class="mobile-header">
          <div class="brand-mark">
            <svg viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1>Loom</h1>
          <button class="hamburger" onClick={() => { this.sidebarOpen = !this.sidebarOpen; this.scheduleUpdate(); }}>
            <svg viewBox="0 0 24 24">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </header>
        <div class={`backdrop ${this.sidebarOpen ? 'visible' : ''}`} onClick={() => { this.sidebarOpen = false; this.scheduleUpdate(); }}></div>
        <aside class={this.sidebarOpen ? 'open' : ''}>
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
            <button class="sidebar-close" onClick={() => { this.sidebarOpen = false; this.scheduleUpdate(); }}>
              <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>

          <button class="search-trigger" onClick={() => this.openSearch()}>
            <loom-icon name="search" size={15}></loom-icon>
            <span class="search-trigger-text">Search...</span>
            <span class="search-trigger-kbd">⌘K</span>
          </button>

          <nav>
            <div class="home-item">
              <loom-link to="/">
                <loom-icon name="home" size="18"></loom-icon>
                Home
              </loom-link>
            </div>

            <div class={`nav-link standalone ${this.isActive("/result") ? "active" : ""}`}>
              <loom-link to="/result">
                <loom-icon name="sparkles" size="18"></loom-icon>
                LoomResult
              </loom-link>
            </div>


            {sections.map(s => (
              <div class={`section ${this.openSections.has(s.title) ? "open" : ""}`}>
                <div class="section-header" onClick={() => this.toggleSection(s.title)}>
                  <svg class="section-chevron" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
                  <span class="section-title">{s.title}</span>
                </div>
                <div class="section-links">
                  {s.items.map(item => ([
                    item.divider ? <div class="nav-divider">{item.divider}{item.dividerVersion ? <span class="divider-version">{item.dividerVersion}</span> : null}</div> : null,
                    <div class={`nav-link ${this.isActive(item.to) ? 'active' : ''}`}>
                      <loom-link to={item.to}>
                        <loom-icon name={item.icon} size="18"></loom-icon>
                        {item.label}
                      </loom-link>
                    </div>
                  ]))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main>
          <div class="page">
            <loom-outlet styles={[docStyles, scrollbar]}></loom-outlet>
          </div>
        </main>
        <doc-search></doc-search>
      </div>
    );
  }
}
