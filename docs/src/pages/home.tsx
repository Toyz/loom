/**
 * Home — Landing Page
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";

@route("/")
@component("page-home")
export class PageHome extends LoomElement {
  update() {
    this.css`
      :host { display: block; }

      .hero {
        text-align: center;
        padding: var(--space-16) 0 var(--space-12);
      }

      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-1) var(--space-4);
        background: var(--accent-glow);
        border: 1px solid var(--accent-dim);
        border-radius: 100px;
        font-size: var(--text-xs);
        font-family: var(--font-mono);
        color: var(--accent);
        margin-bottom: var(--space-6);
      }

      h1 {
        font-size: var(--text-4xl);
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: var(--leading-tight);
        margin-bottom: var(--space-4);
      }

      h1 span {
        background: linear-gradient(135deg, var(--accent) 0%, var(--rose) 50%, var(--amber) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        background-size: 200% 200%;
        animation: shimmer 6s ease-in-out infinite;
      }

      @keyframes shimmer {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      .subtitle {
        font-size: var(--text-xl);
        color: var(--text-secondary);
        max-width: 540px;
        margin: 0 auto var(--space-8);
        line-height: var(--leading-normal);
      }

      .hero-actions {
        display: flex;
        justify-content: center;
        gap: var(--space-3);
      }

      .btn {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-6);
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s;
        cursor: pointer;
        border: none;
      }

      .btn-primary {
        background: var(--accent);
        color: #fff;
      }
      .btn-primary:hover {
        background: var(--accent-dim);
        text-decoration: none;
      }

      .btn-ghost {
        background: transparent;
        color: var(--text-secondary);
        border: 1px solid var(--border-muted);
      }
      .btn-ghost:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
        text-decoration: none;
      }

      /* Features */
      .features {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-4);
        margin-top: var(--space-12);
      }

      .feature {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: var(--space-6);
        transition: all 0.2s;
      }
      .feature:hover {
        border-color: var(--border-muted);
        transform: translateY(-2px);
      }

      .feature-icon {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: var(--space-4);
      }

      .feature h3 {
        font-size: var(--text-base);
        font-weight: 600;
        margin-bottom: var(--space-2);
      }

      .feature p {
        font-size: var(--text-sm);
        color: var(--text-secondary);
        line-height: var(--leading-normal);
      }

      .ic-purple  { background: rgba(129,140,248,.12); }
      .ic-rose    { background: rgba(244,114,182,.12); }
      .ic-emerald { background: rgba(52,211,153,.12); }
      .ic-amber   { background: rgba(251,191,36,.12); }
      .ic-cyan    { background: rgba(34,211,238,.12); }
      .ic-white   { background: rgba(232,232,240,.08); }

      /* Stats */
      .stats {
        display: flex;
        justify-content: center;
        gap: var(--space-12);
        margin-top: var(--space-12);
        padding-top: var(--space-8);
        border-top: 1px solid var(--border-subtle);
      }

      .stat {
        text-align: center;
      }

      .stat-value {
        font-size: var(--text-2xl);
        font-weight: 700;
        font-family: var(--font-mono);
        color: var(--accent);
      }

      .stat-label {
        font-size: var(--text-xs);
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: var(--space-1);
      }

      .install {
        margin-top: var(--space-8);
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: var(--space-4) var(--space-6);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);
        font-family: var(--font-mono);
        font-size: var(--text-sm);
        color: var(--text-secondary);
        max-width: 400px;
        margin-left: auto;
        margin-right: auto;
      }

      .install code {
        color: var(--text-primary);
      }
    `;

    return (
      <div>
        <div class="hero">
          <div class="hero-badge">
            <loom-icon name="zap" size={12} color="var(--accent)"></loom-icon>
            {`v${__LOOM_VERSION__} — Zero dependencies`}
          </div>
          <h1>
            Weave the web with <span>Loom</span>
          </h1>
          <p class="subtitle">
            A decorator-driven web component framework. No virtual DOM, no build-time magic — just TypeScript, JSX, and the platform.
          </p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/guides/getting-started">
              <loom-icon name="rocket" size={16} color="#fff"></loom-icon>
              Get Started
            </a>
            <a class="btn btn-ghost" href="https://github.com/toyz/loom" target="_blank">
              <loom-icon name="code" size={16}></loom-icon>
              GitHub
            </a>
          </div>
          <div class="install">
            <loom-icon name="terminal" size={14}></loom-icon>
            <code>npm install @toyz/loom</code>
          </div>
        </div>

        <div class="features">
          <div class="feature">
            <div class="feature-icon ic-purple">
              <loom-icon name="hash" size={20} color="var(--accent)"></loom-icon>
            </div>
            <h3>19 Decorators</h3>
            <p>Component, prop, reactive, computed, watch, emit, query, on, mount, unmount — everything you need, nothing you don't.</p>
          </div>
          <div class="feature">
            <div class="feature-icon ic-rose">
              <loom-icon name="code" size={20} color="var(--rose)"></loom-icon>
            </div>
            <h3>Native JSX</h3>
            <p>JSX compiles directly to DOM nodes. No virtual DOM overhead, no reconciler — just the platform, at full speed.</p>
          </div>
          <div class="feature">
            <div class="feature-icon ic-emerald">
              <loom-icon name="refresh" size={20} color="var(--emerald)"></loom-icon>
            </div>
            <h3>Smart Morphing</h3>
            <p>Keyed DOM diffing that only touches what changed. Preserves focus, scroll, and selection across updates.</p>
          </div>
          <div class="feature">
            <div class="feature-icon ic-amber">
              <loom-icon name="bolt" size={20} color="var(--amber)"></loom-icon>
            </div>
            <h3>Reactive State</h3>
            <p>Observable values with optional persistence. Swap storage backends at runtime — localStorage, session, or your own.</p>
          </div>
          <div class="feature">
            <div class="feature-icon ic-cyan">
              <loom-icon name="compass" size={20} color="var(--cyan)"></loom-icon>
            </div>
            <h3>Dual-Mode Router</h3>
            <p>Hash or history routing with decorator-driven guards, path params, and zero config — just tag your components.</p>
          </div>
          <div class="feature">
            <div class="feature-icon ic-white">
              <loom-icon name="box" size={20} color="var(--text-secondary)"></loom-icon>
            </div>
            <h3>Dependency Injection</h3>
            <p>Service container with @inject, @factory, and @service. Wire up your app without prop drilling.</p>
          </div>
        </div>

        <div class="stats">
          <div class="stat">
            <div class="stat-value">0</div>
            <div class="stat-label">Dependencies</div>
          </div>
          <div class="stat">
            <div class="stat-value">~8kb</div>
            <div class="stat-label">Gzipped</div>
          </div>
          <div class="stat">
            <div class="stat-value">19</div>
            <div class="stat-label">Decorators</div>
          </div>
          <div class="stat">
            <div class="stat-value">100%</div>
            <div class="stat-label">TypeScript</div>
          </div>
        </div>
      </div>
    );
  }
}
