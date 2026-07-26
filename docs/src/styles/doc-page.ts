/**
 * Shared styles for documentation pages.
 *
 * Design direction: the Jacquard loom (see src/styles.css for the full note).
 * Structure comes from the warp — hairline rules and a punched left rail —
 * not from wrapping every block in a rounded card. Card stock is reserved for
 * things that represent a physical artifact.
 *
 * Class names are kept stable so every page keeps rendering while content is
 * rewritten section by section.
 *
 * Adopted via inherit-styles from the outlet, or manually via
 * `this.shadow.adoptedStyleSheets = [docStyles]`.
 */
import { css } from "@toyz/loom";

export const docStyles = css`
  :host {
    display: block;
    color: var(--text-primary, #e6e1d3);
    line-height: var(--leading-normal, 1.65);
  }

  /* ── Headings ──
     Display face is Plex Condensed: narrow, industrial, machine-stamped.
     No gradient fill and no shimmer — a title is a label, not an effect. */

  h1 {
    font-family: var(--font-display);
    font-size: var(--text-3xl, 2.75rem);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: var(--leading-tight, 1.1);
    margin-bottom: var(--space-3, 0.75rem);
    color: var(--text-primary, #e6e1d3);
    text-transform: uppercase;
  }

  .subtitle {
    color: var(--text-secondary, #a09a88);
    font-size: var(--text-lg, 1.0625rem);
    line-height: 1.55;
    margin-bottom: var(--space-8, 2rem);
    font-weight: 400;
    max-width: 62ch;
  }
  /* The old decorative gradient bar is gone. The rule below the header is
     structural — it is the first weft line of the page. */
  .subtitle::after {
    content: '';
    display: block;
    margin-top: var(--space-6, 1.5rem);
    height: 1px;
    background: var(--warp, #33322a);
  }

  h2 {
    font-family: var(--font-display);
    font-size: var(--text-xl, 1.375rem);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.01em;
    margin-bottom: var(--space-4, 1rem);
    padding-bottom: var(--space-2, 0.5rem);
    border-bottom: 1px solid var(--warp, #33322a);
    color: var(--text-primary, #e6e1d3);
  }

  h3 {
    font-family: var(--font-sans);
    font-size: var(--text-base, 0.9375rem);
    font-weight: 600;
    letter-spacing: 0.02em;
    margin-bottom: var(--space-3, 0.75rem);
    color: var(--text-primary, #e6e1d3);
  }

  /* ── Text ── */

  p {
    color: var(--text-secondary, #a09a88);
    line-height: var(--leading-normal, 1.65);
    margin-bottom: var(--space-4, 1rem);
    max-width: 68ch;
  }

  strong { color: var(--text-primary, #e6e1d3); font-weight: 600; }

  ul, ol {
    color: var(--text-secondary, #a09a88);
    margin: 0 0 var(--space-4, 1rem) var(--space-5, 1.25rem);
    max-width: 68ch;
  }
  li { margin-bottom: var(--space-2, 0.5rem); }
  li::marker { color: var(--warp-lit, #4a4839); }

  /* ── Sections ── */

  section {
    margin-bottom: var(--space-12, 3rem);
  }

  /* ── Inline code ──
     Underlined rather than boxed. Boxing every identifier turns prose into a
     field of chips and makes the real code blocks read as less important. */

  .ic {
    font-family: var(--font-mono, monospace);
    font-size: 0.875em;
    color: var(--text-primary, #e6e1d3);
    background: transparent;
    border: none;
    padding: 0;
    border-bottom: 1px solid var(--thread-dim, #8f3423);
    white-space: nowrap;
  }

  /* ── Tables ── */

  .api-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: var(--space-6, 1.5rem);
    font-size: var(--text-sm, 0.8125rem);
    border-top: 1px solid var(--warp-lit, #4a4839);
    border-bottom: 1px solid var(--warp-lit, #4a4839);
  }
  .api-table th,
  .api-table td {
    text-align: left;
    padding: var(--space-3, 0.75rem) var(--space-4, 1rem) var(--space-3, 0.75rem) 0;
    border-bottom: 1px solid var(--warp, #33322a);
    vertical-align: top;
  }
  .api-table th {
    background: transparent;
    color: var(--text-muted, #6d6858);
    font-family: var(--font-mono);
    font-weight: 500;
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.11em;
    padding-top: var(--space-2, 0.5rem);
    padding-bottom: var(--space-2, 0.5rem);
  }
  .api-table tbody tr:last-child td { border-bottom: none; }
  .api-table td code,
  .api-table td .ic {
    color: var(--text-primary, #e6e1d3);
    font-family: var(--font-mono, monospace);
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--thread-dim, #8f3423);
    padding: 0;
    font-size: 0.9em;
  }

  /* ── API entry ──
     Each entry is a woven row: a thread-red punch marker in the left rail,
     the signature in mono, then prose. No card, no icon-colour roulette. */

  .feature-entry {
    margin-bottom: var(--space-8, 2rem);
    padding-left: var(--space-5, 1.25rem);
    border-left: 1px solid var(--warp, #33322a);
  }
  .feature-entry:last-child { margin-bottom: 0; }

  .dec-sig {
    position: relative;
    font-family: var(--font-mono, monospace);
    font-size: var(--text-base, 0.9375rem);
    color: var(--text-primary, #e6e1d3);
    margin-bottom: var(--space-2, 0.5rem);
    font-weight: 600;
    letter-spacing: -0.01em;
  }
  /* The punch: a single filled position on the rail, marking this entry. */
  .dec-sig::before {
    content: '';
    position: absolute;
    left: calc(var(--space-5, 1.25rem) * -1 - 1px);
    top: 0.45em;
    width: 3px;
    height: 3px;
    background: var(--thread, #c4472f);
    transform: translateX(-1px);
  }

  .dec-desc {
    color: var(--text-secondary, #a09a88);
    font-size: var(--text-sm, 0.8125rem);
    margin-bottom: var(--space-3, 0.75rem);
    line-height: 1.65;
    max-width: 68ch;
  }

  /* ── Group header ──
     Was a bordered pill with a randomly-coloured icon. Now a plain weft rule
     with a mono index — the icon carried no information. */

  .group-header {
    display: flex;
    align-items: baseline;
    gap: var(--space-3, 0.75rem);
    border: none;
    border-bottom: 1px solid var(--warp-lit, #4a4839);
    border-radius: 0;
    background: transparent;
    padding: 0 0 var(--space-2, 0.5rem);
    margin: 0 0 var(--space-5, 1.25rem);
  }
  .group-header loom-icon {
    flex-shrink: 0;
    display: flex;
    align-self: center;
    opacity: 0.55;
  }
  .group-header h2 {
    border-bottom: none;
    margin: 0;
    padding: 0;
    font-size: var(--text-xl, 1.375rem);
    line-height: 1.2;
  }

  /* ── Callouts ──
     Four levels, distinguished by rule weight and one word of printed label,
     not by emoji. Emoji in technical prose reads as decoration. */

  .note, .tip, .warning, .caution {
    border-radius: 0;
    padding: var(--space-3, 0.75rem) 0 var(--space-3, 0.75rem) var(--space-4, 1rem);
    margin-bottom: var(--space-4, 1rem);
    font-size: var(--text-sm, 0.8125rem);
    line-height: 1.65;
    position: relative;
    background: transparent;
    color: var(--text-secondary, #a09a88);
    max-width: 68ch;
  }
  .note p, .tip p, .warning p, .caution p { margin-bottom: 0; }

  .note::before, .tip::before, .warning::before, .caution::before {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    margin-bottom: var(--space-1, 0.25rem);
  }

  .note    { border-left: 1px solid var(--indigo-dim, #47607a); }
  .note::before    { content: 'NOTE';    color: var(--indigo, #6b8cae); }

  .tip     { border-left: 1px solid var(--ok, #7f9c5a); }
  .tip::before     { content: 'TIP';     color: var(--ok, #7f9c5a); }

  .warning { border-left: 1px solid var(--warn, #c99a3d); }
  .warning::before { content: 'CAUTION'; color: var(--warn, #c99a3d); }

  /* Caution is the strongest level: a data-loss or security footgun. */
  .caution { border-left: 2px solid var(--thread, #c4472f); background: var(--thread-wash, rgba(196,71,47,0.10)); padding-right: var(--space-4, 1rem); }
  .caution::before { content: 'DO NOT';  color: var(--thread, #c4472f); }

  /* ── Specimen ──
     Card stock. Reserved for a worked artifact the reader can lift out:
     a complete component, a finished file. Not a generic container. */

  .specimen {
    background: var(--card, #ded6c0);
    color: var(--card-ink, #1a1913);
    border: 1px solid var(--card-edge, #c9c0a6);
    clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%);
    padding: var(--space-5, 1.25rem);
    margin-bottom: var(--space-5, 1.25rem);
  }
  .specimen p { color: color-mix(in srgb, var(--card-ink) 72%, transparent); }
  .specimen strong { color: var(--card-ink); }
  .specimen .label {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: color-mix(in srgb, var(--card-ink) 50%, transparent);
    margin-bottom: var(--space-2, 0.5rem);
  }

  /* ── Badge ── */

  .badge {
    display: inline-block;
    background: transparent;
    color: var(--thread, #c4472f);
    border: 1px solid var(--thread-dim, #8f3423);
    font-family: var(--font-mono);
    font-size: 0.625rem;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 0;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    vertical-align: middle;
  }

  /* ── Legacy pre/code blocks (pages not yet migrated to <code-block>) ── */

  pre {
    background: var(--ground-sunk, #100f0b);
    border: 1px solid var(--warp, #33322a);
    border-left: 2px solid var(--warp-lit, #4a4839);
    border-radius: 0;
    padding: var(--space-4, 1rem) var(--space-5, 1.25rem);
    overflow-x: auto;
    margin-bottom: var(--space-4, 1rem);
    line-height: 1.7;
  }

  code {
    font-family: var(--font-mono, monospace);
    font-size: 0.85em;
  }

  p code, li code, td code {
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--thread-dim, #8f3423);
    padding: 0;
    border-radius: 0;
    color: var(--text-primary, #e6e1d3);
    font-weight: 400;
    white-space: nowrap;
  }

  /* ── Links ── */

  a {
    color: var(--thread, #c4472f);
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* ── Mobile content ── */

  @media (max-width: 768px) {
    h1 { font-size: 2rem; }
    h2 { font-size: 1.1875rem; }
    .subtitle { font-size: 1rem; }
    .ic { white-space: normal; word-break: break-word; }
    .api-table {
      display: block;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .feature-entry { padding-left: var(--space-4, 1rem); }
    pre { font-size: 0.8em; padding: 0.75rem 1rem; }
  }
`;

/** Override loom-link's anchor to display inline (for use inside flowing text) */
export const inlineLink = css`a { display: inline; }`;

/** Make loom-link's anchor fill its container (for nav cards) */
export const navLink = css`a { display: flex; width: 100%; height: 100%; }`;
