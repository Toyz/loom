/**
 * 404 — Not Found
 */
import { LoomElement, component } from "@toyz/loom";
import { route } from "@toyz/loom/router";

@route("*")
@component("page-not-found")
export class PageNotFound extends LoomElement {
  update() {
    this.css`
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        text-align: center;
      }

      .container {
        max-width: 400px;
      }

      .code {
        font-size: 6rem;
        font-weight: 800;
        font-family: var(--font-mono);
        background: linear-gradient(135deg, var(--accent), var(--rose));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        line-height: 1;
        margin-bottom: var(--space-4);
      }

      h1 {
        font-size: var(--text-xl);
        font-weight: 700;
        margin-bottom: var(--space-2);
      }

      p {
        color: var(--text-secondary);
        margin-bottom: var(--space-6);
      }

      a {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-6);
        background: var(--accent);
        color: #fff;
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        font-weight: 600;
        text-decoration: none;
        transition: background 0.2s;
      }
      a:hover {
        background: var(--accent-dim);
        text-decoration: none;
      }
    `;

    return (
      <div class="container">
        <div class="code">404</div>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a href="#/">
          <loom-icon name="arrow-right" size={16} color="#fff"></loom-icon>
          Back to Home
        </a>
      </div>
    );
  }
}
