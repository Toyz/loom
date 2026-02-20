/**
 * Shared styles for documentation pages.
 * Adopted via inherit-styles from the outlet, or
 * manually via `this.shadow.adoptedStyleSheets = [docStyles]`.
 */
import { css } from "@toyz/loom";

export const docStyles = css`
  :host {
    display: block;
    color: var(--text-primary, #e8e8f0);
    line-height: var(--leading-normal, 1.6);
  }

  /* ── Headings ── */

  h1 {
    font-size: var(--text-3xl, 2.5rem);
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: var(--space-2, 0.5rem);
    line-height: var(--leading-tight, 1.2);
  }

  h2 {
    font-size: var(--text-xl, 1.375rem);
    font-weight: 700;
    margin-bottom: var(--space-4, 1rem);
    padding-bottom: var(--space-2, 0.5rem);
    border-bottom: 1px solid var(--border-subtle, #1e1e2a);
  }

  h3 {
    font-size: var(--text-lg, 1.125rem);
    font-weight: 600;
    margin-bottom: var(--space-3, 0.75rem);
  }

  /* ── Text ── */

  p {
    color: var(--text-secondary, #9898ad);
    line-height: var(--leading-normal, 1.6);
    margin-bottom: var(--space-4, 1rem);
  }

  .subtitle {
    color: var(--text-secondary, #9898ad);
    font-size: var(--text-lg, 1.125rem);
    margin-bottom: var(--space-10, 2.5rem);
  }

  /* ── Sections ── */

  section {
    margin-bottom: var(--space-10, 2.5rem);
  }

  /* ── Inline code ── */

  .ic {
    background: var(--bg-raised, #1a1a24);
    border: 1px solid var(--border-subtle, #1e1e2a);
    padding: 2px 7px;
    border-radius: var(--radius-sm, 6px);
    font-family: var(--font-mono, monospace);
    font-size: 0.85em;
    color: var(--accent, #818cf8);
    font-weight: 500;
    white-space: nowrap;
  }

  /* ── Tables ── */

  .api-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin-bottom: var(--space-6, 1.5rem);
    font-size: var(--text-sm, 0.8125rem);
    border: 1px solid var(--border-subtle, #1e1e2a);
    border-radius: var(--radius-md, 8px);
    overflow: hidden;
  }
  .api-table th,
  .api-table td {
    text-align: left;
    padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
    border-bottom: 1px solid var(--border-subtle, #1e1e2a);
  }
  .api-table th {
    background: rgba(255, 255, 255, 0.03);
    color: var(--text-muted, #5e5e74);
    font-weight: 600;
    font-size: var(--text-xs, 0.75rem);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .api-table tbody tr:nth-child(even) {
    background: rgba(255, 255, 255, 0.015);
  }
  .api-table tbody tr:last-child td {
    border-bottom: none;
  }
  .api-table td code,
  .api-table td .ic {
    color: var(--accent, #818cf8);
    font-family: var(--font-mono, monospace);
    background: var(--bg-raised, #1a1a24);
    border: 1px solid var(--border-subtle, #1e1e2a);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.85em;
  }

  /* ── Decorator / API entry helpers ── */

  .feature-entry {
    margin-bottom: var(--space-6, 1.5rem);
  }
  .feature-entry:last-child {
    margin-bottom: 0;
  }

  .dec-sig {
    font-family: var(--font-mono, monospace);
    font-size: var(--text-base, 0.9375rem);
    color: var(--accent, #818cf8);
    margin-bottom: var(--space-1, 0.25rem);
    font-weight: 600;
  }

  .dec-desc {
    color: var(--text-secondary, #9898ad);
    font-size: var(--text-sm, 0.8125rem);
    margin-bottom: var(--space-3, 0.75rem);
    line-height: 1.6;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: var(--space-3, 0.75rem);
  }

  /* ── Callouts ── */

  .note {
    background: var(--bg-raised, #1a1a24);
    border-left: 3px solid var(--accent, #818cf8);
    border-radius: var(--radius-sm, 6px);
    padding: var(--space-3, 0.75rem) var(--space-4, 1rem);
    margin-bottom: var(--space-4, 1rem);
    font-size: var(--text-sm, 0.8125rem);
    color: var(--text-secondary, #9898ad);
    line-height: 1.6;
  }
  .note p { margin-bottom: 0; }

  .badge {
    display: inline-block;
    background: var(--accent-glow, rgba(129, 140, 248, .12));
    color: var(--accent, #818cf8);
    font-size: var(--text-xs, 0.75rem);
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 9999px;
    letter-spacing: 0.03em;
    vertical-align: middle;
  }

  /* ── Legacy pre/code blocks (for pages not yet migrated to <code-block>) ── */

  pre {
    background: #0d0d14;
    border: 1px solid var(--border-subtle, #1e1e2a);
    border-radius: var(--radius-md, 8px);
    padding: var(--space-4, 1rem) var(--space-5, 1.25rem);
    overflow-x: auto;
    margin-bottom: var(--space-4, 1rem);
    line-height: 1.7;
  }

  code {
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);
    font-size: 0.85em;
  }

  /* Inline code in prose — match .ic styling */
  p code, li code, td code {
    background: var(--bg-raised, #1a1a24);
    border: 1px solid var(--border-subtle, #1e1e2a);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--accent, #818cf8);
    font-weight: 500;
    white-space: nowrap;
  }

  /* ── Links ── */

  a {
    color: var(--accent, #818cf8);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }

  /* ── Mobile content ── */

  @media (max-width: 768px) {
    h1 {
      font-size: 1.75rem;
    }
    h2 {
      font-size: 1.125rem;
    }
    .subtitle {
      font-size: 1rem;
    }
    .ic {
      white-space: normal;
      word-break: break-word;
    }
    .api-table {
      display: block;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    pre {
      font-size: 0.8em;
      padding: 0.75rem 1rem;
    }
  }
`;
