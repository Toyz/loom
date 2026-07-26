/**
 * Loom Docs — App Shell
 */

import { LoomElement, component, reactive, on, css, mount, query } from "@toyz/loom";
import { LoomLink, RouteChanged } from "@toyz/loom/router";
import { docStyles } from "./styles/doc-page";
import { scrollbar } from "./shared/scrollbar";
import { SEARCH_HOTKEY } from "./components/doc-search";

interface NavItem { label: string; to: string; icon: string; divider?: string; dividerVersion?: string }
interface NavSection { title: string; items: NavItem[] }

const sections: NavSection[] = [
  {
    title: "Guides",
    items: [
      { label: "Getting Started", to: "/guides/getting-started", icon: "book" },
      { label: "Your First App", to: "/guides/your-first-app", icon: "sparkles" },
      { label: "Debugging", to: "/guides/debugging", icon: "search" },
      { label: "LoomResult", to: "/result", icon: "sparkles" },
      { label: "Hydration", to: "/guides/hydration", icon: "zap" },
    ],
  },
  {
    title: "Element",
    items: [
      { label: "Overview", to: "/element/overview", icon: "cube" },
      { label: "Lifecycle", to: "/element/lifecycle", icon: "refresh" },
      { label: "Timing", to: "/element/timing", icon: "zap" },
      { label: "CSS", to: "/element/css", icon: "palette" },
      { label: "DOM Queries", to: "/element/queries", icon: "search" },
      { label: "JSX & Morphing", to: "/element/jsx", icon: "code" },
      { label: "Decorators", to: "/element/decorators", icon: "hash" },
      { label: "Attributes", to: "/element/attributes", icon: "plug" },
      { label: "Light DOM", to: "/element/light-dom", icon: "sun" },
      { label: "Lazy Loading", to: "/element/lazy", icon: "download" },
      { label: "Observer", to: "/element/observer", icon: "eye" },
      { label: "Forms", to: "/element/forms", icon: "clipboard" },
      { label: "Fetch", to: "/store/api", icon: "zap", divider: "Data Fetching" },
      { label: "Virtual List", to: "/element/virtual-list", icon: "list", divider: "Built-ins" },
      { label: "Icon", to: "/element/icon", icon: "star" },
      { label: "Canvas", to: "/element/canvas", icon: "canvas" },
      { label: "Image", to: "/element/image", icon: "image" },
    ],
  },
  {
    title: "Decorators",
    items: [
      { label: "Overview", to: "/decorators/overview", icon: "hash" },
      { label: "Events", to: "/decorators/events", icon: "broadcast" },
      { label: "Transform", to: "/decorators/transform", icon: "refresh" },
      { label: "Hotkey", to: "/decorators/hotkey", icon: "command" },
      { label: "Log", to: "/decorators/log", icon: "zap" },
      { label: "Context", to: "/decorators/context", icon: "thread" },
      { label: "Portal", to: "/decorators/portal", icon: "external-link" },
      { label: "Typed Symbols", to: "/decorators/symbols", icon: "key" },
      { label: "Media", to: "/decorators/media", icon: "monitor" },
      { label: "Permission", to: "/decorators/permission", icon: "shield-check" },
      { label: "Fullscreen", to: "/decorators/fullscreen", icon: "maximize" },
      { label: "Clipboard", to: "/decorators/clipboard", icon: "clipboard" },
      { label: "Drag & Drop", to: "/decorators/dnd", icon: "move" },
      { label: "Dynamic CSS", to: "/decorators/css", icon: "palette" },
    ],
  },
  {
    title: "Store",
    items: [
      { label: "Overview", to: "/store/overview", icon: "archive" },
      { label: "Reactive", to: "/store/reactive", icon: "bolt" },
      { label: "Decorator", to: "/store/store-decorator", icon: "package" },
      { label: "Storage", to: "/store/storage", icon: "database" },
      { label: "Patterns", to: "/store/patterns", icon: "layers" },
      { label: "Signals", to: "/store/signals", icon: "radio" },
    ],
  },
  {
    title: "Router",
    items: [
      { label: "Overview", to: "/router/overview", icon: "compass" },
      { label: "Routes", to: "/router/routes", icon: "map" },
      { label: "Route Data", to: "/router/route-data", icon: "database" },
      { label: "Groups", to: "/router/groups", icon: "layers" },
      { label: "Guards", to: "/router/guards", icon: "shield" },
      { label: "Navigation", to: "/router/navigation", icon: "arrow-right" },
      { label: "Lifecycle", to: "/router/route-lifecycle", icon: "refresh" },
      { label: "Decorators", to: "/router/decorators", icon: "hash" },
    ],
  },
  {
    title: "DI & Services",
    items: [
      { label: "Overview", to: "/di/overview", icon: "box" },
      { label: "Decorators", to: "/di/decorators", icon: "hash" },
    ],
  },
  {
    title: "Packages",
    items: [
      { label: "Overview",   to: "/packages/rpc-overview",   icon: "package",  divider: "RPC", dividerVersion: `v${__LOOM_RPC_VERSION__}` },
      { label: "Queries",    to: "/packages/rpc-queries",    icon: "download" },
      { label: "Mutations",  to: "/packages/rpc-mutations",  icon: "edit"     },
      { label: "Transports", to: "/packages/rpc-transports", icon: "layers"   },
      { label: "Streams",    to: "/packages/rpc-streams",    icon: "radio"    },
      { label: "Testing",    to: "/packages/rpc-testing",    icon: "check"    },
      { label: "Demo",       to: "/packages/rpc-demo",       icon: "zap"      },
      { label: "Overview", to: "/packages/analytics-overview", icon: "package", divider: "Analytics", dividerVersion: `v${__LOOM_ANALYTICS_VERSION__}` },
      { label: "Testing", to: "/packages/analytics-testing", icon: "check" },
      { label: "Demo", to: "/packages/analytics-demo", icon: "zap" },
      { label: "Overview", to: "/packages/flags-overview", icon: "package", divider: "Flags", dividerVersion: `v${__LOOM_FLAGS_VERSION__}` },
      { label: "Testing", to: "/packages/flags-testing", icon: "check" },
      { label: "Demo", to: "/packages/flags-demo", icon: "zap" },
      { label: "Overview", to: "/packages/placeholder-overview", icon: "package", divider: "Placeholder", dividerVersion: `v${__LOOM_PLACEHOLDER_VERSION__}` },
      { label: "Testing", to: "/packages/placeholder-testing", icon: "check" },
      { label: "Demo", to: "/packages/placeholder-demo", icon: "zap" },
      { label: "Overview", to: "/packages/create-loom", icon: "package", divider: "Create Loom", dividerVersion: `v${__CREATE_LOOM_VERSION__}` },
    ],
  },
  {
    title: "Examples",
    items: [
      { label: "Clock", to: "/examples/clock", icon: "zap" },
      { label: "Attributes", to: "/examples/attributes", icon: "plug" },
      { label: "Todo List", to: "/examples/todo", icon: "check" },
      { label: "Kanban Board", to: "/examples/kanban", icon: "columns" },
      { label: "Theme Switcher", to: "/examples/theme-switcher", icon: "eye" },
      { label: "Contact Form", to: "/examples/form", icon: "edit" },
      { label: "Fetch", to: "/examples/api", icon: "download" },
      { label: "Virtual List", to: "/examples/virtual-list-demo", icon: "list" },
      { label: "Timing", to: "/examples/timing-demo", icon: "clock" },
      { label: "Stress Test", to: "/examples/stress-test", icon: "zap" },
      { label: "Canvas Game", to: "/examples/canvas-game", icon: "canvas" },
      { label: "Image Gallery", to: "/examples/image-gallery", icon: "image" },
      { label: "EventBus", to: "/examples/eventbus", icon: "broadcast" },
    ],
  },
];

const styles = css`
  :host {
    display: flex;
    min-height: 100vh;
    font-family: "IBM Plex Sans", system-ui, -apple-system, sans-serif;
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
    background: var(--bg-surface, var(--ground-sunk));
    border-bottom: 1px solid var(--border-subtle, var(--warp));
    align-items: center;
    padding: 0 16px;
    gap: 12px;
  }
  .mobile-header .brand-mark {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--accent, var(--thread)), var(--rose, var(--thread)));
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
    stroke: var(--text-primary);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .mobile-header h1 {
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text-primary, var(--text-primary));
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
    color: var(--text-secondary, var(--text-secondary));
    cursor: pointer;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.15s ease, color 0.15s ease;
    flex-shrink: 0;
  }
  .hamburger:hover {
    background: var(--bg-hover, var(--ground-hover));
    color: var(--text-primary, var(--text-primary));
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
    color: var(--text-muted, var(--text-muted));
    cursor: pointer;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-left: auto;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .sidebar-close:hover {
    background: var(--bg-hover, var(--ground-hover));
    color: var(--text-primary, var(--text-primary));
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
    background: var(--bg-surface, var(--ground-sunk));
    border-right: 1px solid var(--border-subtle, var(--warp));
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 100;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.06) transparent;
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* ── Brand ──
     Was a rounded gradient tile with a drop shadow — the same mark every
     framework site ships. Now a stamped wordmark over a punch row, which is
     the identity this design is actually built on. */

  .brand {
    display: block;
    padding: 26px 22px 18px;
    border-bottom: 1px solid var(--warp, #33322a);
    flex-shrink: 0;
  }
  .brand-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  /* The old .brand-mark SVG tile is hidden rather than removed, so the
     pre-paint DSD shell in index.html keeps its markup valid. */
  .brand-mark { display: none; }
  .brand h1 {
    font-family: var(--font-display, sans-serif);
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    color: var(--text-primary, #e6e1d3);
    margin: 0;
    line-height: 1;
  }
  .brand-version {
    margin-left: auto;
    font-size: 0.625rem;
    font-family: var(--font-mono, monospace);
    color: var(--text-muted, #6d6858);
    border: none;
    padding: 0;
    border-radius: 0;
    white-space: nowrap;
    letter-spacing: 0.06em;
  }
  /* A row of punch positions under the wordmark. Fixed pattern, used as a
     maker's mark rather than as data. */
  .brand-punches {
    display: flex;
    gap: 4px;
    margin-top: 10px;
  }
  .brand-punches i {
    display: flex;
    color: var(--warp-lit, #4a4839);
  }
  /* Punched reads as a hole everywhere else in the system, so it reads as a
     hole here too — a dimmed thread fill, not five alarm-red blocks. */
  .brand-punches i.on {
    color: var(--thread-dim, #8f3423);
  }

  /* ── Search ──
     Was a rounded pill with a hardcoded shortcut chip. Now a ruled field, like
     the index line
     on a card sleeve. */

  .search-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    flex-shrink: 0;
    padding: 11px 22px;
    border: none;
    border-bottom: 1px solid var(--warp, #33322a);
    border-radius: 0;
    background: transparent;
    cursor: pointer;
    width: 100%;
    text-align: left;
    transition: background 0.15s ease;
  }
  .search-trigger:hover {
    background: var(--ground-hover, #24241b);
  }
  .search-trigger loom-icon {
    flex-shrink: 0;
    color: var(--text-muted, #6d6858);
  }
  .search-trigger-text {
    flex: 1;
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    color: var(--text-muted, #6d6858);
  }
  .search-trigger-kbd {
    font-size: 0.625rem;
    font-family: var(--font-mono, monospace);
    color: var(--text-muted, #6d6858);
    border: none;
    padding: 0;
    border-radius: 0;
    opacity: 1;
  }

  /* ── Navigation ── */

  nav {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 8px 0 40px;
    scrollbar-width: thin;
    scrollbar-color: var(--warp-lit, #4a4839) transparent;
  }

  .home-item { margin: 0; }

  .nav-link.standalone { margin: 0; }
  .nav-link.standalone loom-link::part(anchor) {
    font-size: 0.8125rem;
  }
  .home-item loom-link::part(anchor) {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 22px;
    border-radius: 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    letter-spacing: 0.03em;
    color: var(--text-secondary, #a09a88);
    text-decoration: none;
    transition: color 0.15s ease, background 0.15s ease;
  }
  .home-item loom-link::part(anchor):hover {
    background: var(--ground-hover, #24241b);
    color: var(--text-primary, #e6e1d3);
  }

  /* Section — a printed field label on the sleeve, not a collapsible widget
     with a chevron. It still toggles; the affordance is the hover, not an arrow. */
  .section {
    margin-top: 4px;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 22px 6px;
    cursor: pointer;
    user-select: none;
  }
  .section-title {
    font-family: var(--font-mono, monospace);
    font-size: 0.625rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--text-muted, #6d6858);
    transition: color 0.15s;
  }
  .section-header:hover .section-title {
    color: var(--text-secondary, #a09a88);
  }
  /* The chevron restated what the open/closed state already showed. */
  .section-chevron { display: none; }

  .section-links {
    overflow: hidden;
    max-height: 0;
    transition: max-height 0.25s ease;
    padding: 0;
  }
  .section.open .section-links {
    max-height: 900px;
    padding-top: 0;
  }

  .nav-divider {
    font-family: var(--font-mono, monospace);
    font-size: 0.5625rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--text-muted, #6d6858);
    opacity: 0.75;
    padding: 12px 22px 4px;
    margin-top: 2px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .divider-version {
    font-size: 0.5rem;
    font-family: var(--font-mono, monospace);
    color: var(--text-muted, #6d6858);
    border: 1px solid var(--warp, #33322a);
    padding: 1px 4px;
    border-radius: 0;
    text-transform: none;
    letter-spacing: 0;
    opacity: 1;
  }

  /* Individual nav link — a row on the index card. Mono, tight, square. */
  .nav-link {
    display: block;
    margin: 0;
    border-radius: 0;
    position: relative;
  }
  .nav-link loom-link::part(anchor) {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 5px 22px 5px 34px;
    border-radius: 0;
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0.01em;
    color: var(--text-secondary, #a09a88);
    text-decoration: none;
    transition: color 0.12s ease, background 0.12s ease;
  }
  .nav-link loom-link::part(anchor):hover {
    background: var(--ground-hover, #24241b);
    color: var(--text-primary, #e6e1d3);
  }
  .nav-link.active loom-link::part(anchor) {
    background: transparent;
    color: var(--text-primary, #e6e1d3);
    font-weight: 500;
  }
  /* Active is a punched position in the rail, matching the motif exactly —
     not a tinted rounded pill. */
  .nav-link.active::before {
    content: '';
    position: absolute;
    left: 20px;
    top: 50%;
    width: 6px;
    height: 9px;
    transform: translateY(-50%);
    background: var(--thread, #c4472f);
    border-radius: 0;
  }

  /* Icons are gone from the nav entirely.
     They were coloured by nth-child through a ten-hue cycle, so the colour of
     any given row depended on its position in the list — it encoded nothing,
     and it was the loudest generated-looking thing on the page. */
  .nav-link loom-icon,
  .home-item loom-icon {
    display: none;
  }

  /* ─────────── Main Content ─────────── */

  /* Two columns: the text, and the punched index in the void beside it.
     Laid out rather than positioned — an earlier version put the rail at a
     left offset computed from the page-geometry tokens and it printed
     straight through the code blocks, because those tokens cannot know the
     real rendered column edge. Flex does. */
  main {
    margin-left: 280px;
    flex: 1;
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    gap: 40px;
  }
  main > .page { flex: 0 1 auto; }

  /* Below this there is no void to put an index in, and the inline TOC in
     the header already covers that case. */
  doc-rail { display: none; }
  @media (min-width: 1400px) {
    doc-rail { display: block; padding-top: 56px; }
  }
  /* The content sits against a warp edge rather than floating centred in
     empty space. The rule is the loom's selvedge — the finished edge the
     weave is anchored to — and it gives every page the same left datum. */
  /* Anchored to the sidebar rather than centred in the viewport: centring a
     narrow column inside a 2000px main leaves ~570px dead on each side and the
     text ends up floating unattached to the nav it belongs to. */
  /* ONE measure for the whole page. Prose used to carry its own 68ch cap
     while code blocks and tables ran the full column, so every paragraph
     wrapped ~300px short of the block below it and the right edge was
     ragged on every page. The column is now 720px of content: ~76ch of
     Plex Sans, and ~92 columns of 13px mono, which is wider than any code
     sample in the docs. Text and code end on the same line. */
  .page {
    max-width: var(--page-w, 832px);
    margin: 0;
    margin-left: var(--page-gap, min(6vw, 88px));
    padding: 56px 56px 96px 56px;
    position: relative;
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

    // Seed from the URL rather than waiting for RouteChanged. On a cold load
    // the router resolves the initial route before this shell has subscribed,
    // so that event never arrives here and the sidebar kept its "/" default —
    // every refresh landed with nothing highlighted.
    this.syncPath(location.hash.replace(/^#/, "").split("?")[0] || "/");
  }

  /** Apply a path to the sidebar: active link, and open the section holding it. */
  private syncPath(path: string) {
    this.currentPath = path;
    for (const s of sections) {
      if (s.items.some((i) => path.startsWith(i.to))) this.openSections.add(s.title);
    }
  }

  @on(RouteChanged)
  onRoute(e: RouteChanged) {
    this.syncPath(e.path);
    this.sidebarOpen = false; // auto-close on mobile nav
    this.scheduleUpdate();
    // After morph applies .active class, scroll it into view
    queueMicrotask(() => {
      this.shadow.querySelector('.nav-link.active')
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
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
            <div class="brand-row">
              <h1>Loom</h1>
              <span class="brand-version">{`v${__LOOM_VERSION__}`}</span>
              <button class="sidebar-close" onClick={() => { this.sidebarOpen = false; this.scheduleUpdate(); }}>
                <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Maker's mark: a fixed punch pattern, the same on every page.
                Decorative by intent — it identifies the site, it does not
                encode anything, which is why it never changes. */}
            <div class="brand-punches" aria-hidden="true">
              <i><loom-icon name="punch" size={12} strokeWidth={1.3} fill="none"></loom-icon></i><i class="on"><loom-icon name="punch" size={12} strokeWidth={1.3} fill="currentColor"></loom-icon></i><i><loom-icon name="punch" size={12} strokeWidth={1.3} fill="none"></loom-icon></i><i><loom-icon name="punch" size={12} strokeWidth={1.3} fill="none"></loom-icon></i><i class="on"><loom-icon name="punch" size={12} strokeWidth={1.3} fill="currentColor"></loom-icon></i>
              <i><loom-icon name="punch" size={12} strokeWidth={1.3} fill="none"></loom-icon></i><i><loom-icon name="punch" size={12} strokeWidth={1.3} fill="none"></loom-icon></i><i class="on"><loom-icon name="punch" size={12} strokeWidth={1.3} fill="currentColor"></loom-icon></i><i><loom-icon name="punch" size={12} strokeWidth={1.3} fill="none"></loom-icon></i>
            </div>
          </div>

          <button class="search-trigger" onClick={() => this.openSearch()}>
            <loom-icon name="search" size={15}></loom-icon>
            <span class="search-trigger-text">Search...</span>
            <span class="search-trigger-kbd">{SEARCH_HOTKEY}</span>
          </button>

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
          <doc-rail></doc-rail>
        </main>
        <doc-search></doc-search>
      </div>
    );
  }
}
