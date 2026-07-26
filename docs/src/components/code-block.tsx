/**
 * <code-block> — Syntax-highlighted code with line numbers.
 *
 * Usage:
 *   <code-block lang="ts" code={`const x = 1;`}></code-block>
 */
import { LoomElement, component, prop, reactive, debounce, css, mount } from "@toyz/loom";
import { DECORATOR_HELP } from "../data/decorator-help";

/* ── Per-language tokenizer rules ── */

interface Token { type: string; text: string }

const TS_RULES: [string, RegExp][] = [
  ["comment",    /^\/\/.*$/m],
  ["comment",    /^\/\*[\s\S]*?\*\//m],
  ["decorator",  /^@\w+/],
  ["string",     /^`(?:[^`\\]|\\.)*`/],
  ["string",     /^"(?:[^"\\]|\\.)*"/],
  ["string",     /^'(?:[^'\\]|\\.)*'/],
  ["keyword",    /^(?:import|from|export|default|class|extends|return|const|let|var|function|if|else|for|while|do|switch|case|break|continue|new|this|super|typeof|instanceof|in|of|async|await|yield|throw|try|catch|finally|void|null|undefined|true|false|type|interface|enum|implements|declare|readonly|abstract|static|private|protected|public|as|is|keyof|never|unknown|any|get|set)\b/],
  ["type",       /^(?:[A-Z][A-Za-z0-9_]*)/],
  ["number",     /^(?:0[xXbBoO][\da-fA-F_]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?)/],
  ["punctuation",/^[{}()\[\];:.,?!<>=+\-*/%&|^~@#]/],
  ["ident",      /^[a-zA-Z_$][\w$]*/],
  ["space",      /^\s+/],
];

const BASH_RULES: [string, RegExp][] = [
  ["comment",    /^#.*$/m],
  ["string",     /^"(?:[^"\\]|\\.)*"/],
  ["string",     /^'[^']*'/],
  ["variable",   /^\$\{[^}]+\}/],
  ["variable",   /^\$[A-Za-z_]\w*/],
  ["keyword",    /^(?:if|then|else|elif|fi|for|while|do|done|case|esac|in|function|return|local|export|source|exit|echo|eval|exec|set|unset|declare|readonly|shift|trap|wait|cd|pwd)\b/],
  ["type",       /^(?:npx|npm|node|yarn|pnpm|vite|tsc|git|docker|go|make|cargo|curl|wget|cat|ls|mkdir|rm|cp|mv|grep|sed|awk|chmod|chown|sudo|apt|brew|pip)\b/],
  ["flag",       /^--?[A-Za-z][\w-]*/],
  ["punctuation",/^[|&;><(){}\[\]!]/],
  ["number",     /^\d+/],
  ["ident",      /^[A-Za-z_][\w.]*/],
  ["space",      /^\s+/],
];

const HTML_RULES: [string, RegExp][] = [
  ["comment",    /^<!--[\s\S]*?-->/],
  ["keyword",    /^<!DOCTYPE\b[^>]*>/i],
  ["tag",        /^<\/?[a-zA-Z][\w-]*(?:\s|\/?>)/],
  ["string",     /^"(?:[^"\\]|\\.)*"/],
  ["string",     /^'(?:[^'\\]|\\.)*'/],
  ["type",       /^[a-zA-Z][\w-]*(?==)/],
  ["punctuation",/^[<>\/=]/],
  ["ident",      /^[a-zA-Z_][\w-]*/],
  ["number",     /^\d+/],
  ["space",      /^\s+/],
];

const JSON_RULES: [string, RegExp][] = [
  ["comment",    /^\/\/.*$/m],
  ["comment",    /^\/\*[\s\S]*?\*\//m],
  ["key",        /^"(?:[^"\\]|\\.)*"(?=\s*:)/],
  ["string",     /^"(?:[^"\\]|\\.)*"/],
  ["keyword",    /^(?:true|false|null)\b/],
  ["number",     /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/],
  ["punctuation",/^[{}\[\]:,]/],
  ["space",      /^\s+/],
];

// TSX: TS + JSX tags. Order matters — JSX tags checked before plain punctuation.
const TSX_RULES: [string, RegExp][] = [
  ["comment",    /^\/\/.*$/m],
  ["comment",    /^\/\*[\s\S]*?\*\//m],
  ["decorator",  /^@\w+/],
  ["string",     /^`(?:[^`\\]|\\.)*`/],
  ["string",     /^"(?:[^"\\]|\\.)*"/],
  ["string",     /^'(?:[^'\\]|\\.)*'/],
  ["tag",        /^<\/[a-zA-Z][\w.-]*/],                   // closing tag </div
  ["tag",        /^<[a-zA-Z][\w.-]*(?=\s|\/?>|\s[^>]*>)/], // opening tag <div
  ["keyword",    /^(?:import|from|export|default|class|extends|return|const|let|var|function|if|else|for|while|do|switch|case|break|continue|new|this|super|typeof|instanceof|in|of|async|await|yield|throw|try|catch|finally|void|null|undefined|true|false|type|interface|enum|implements|declare|readonly|abstract|static|private|protected|public|as|is|keyof|never|unknown|any|get|set)\b/],
  ["type",       /^(?:[A-Z][A-Za-z0-9_]*)/],
  ["number",     /^(?:0[xXbBoO][\da-fA-F_]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?)/],
  ["punctuation",/^[{}()\[\];:.,?!<>=+\-*/%&|^~@#\/]/],
  ["ident",      /^[a-zA-Z_$][\w$]*/],
  ["space",      /^\s+/],
];

const LANG_RULES: Record<string, [string, RegExp][]> = {
  ts: TS_RULES,
  typescript: TS_RULES,
  tsx: TSX_RULES,
  jsx: TSX_RULES,
  js: TS_RULES,
  javascript: TS_RULES,
  json: JSON_RULES,
  jsonc: JSON_RULES,
  bash: BASH_RULES,
  sh: BASH_RULES,
  shell: BASH_RULES,
  html: HTML_RULES,
  xml: HTML_RULES,
  svg: HTML_RULES,
};

function tokenize(code: string, lang: string): Token[] {
  const rules = LANG_RULES[lang] ?? TS_RULES;
  const tokens: Token[] = [];
  let i = 0;
  while (i < code.length) {
    let matched = false;
    for (const [type, re] of rules) {
      const m = re.exec(code.slice(i));
      if (m && m.index === 0) {
        tokens.push({ type, text: m[0] });
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ type: "plain", text: code[i] });
      i++;
    }
  }
  return tokens;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlight(code: string, lang = "ts"): string {
  return tokenize(code, lang)
    .map(t => {
      const escaped = escapeHtml(t.text);
      if (t.type === "space" || t.type === "plain") return escaped;
      // Decorator tokens we can explain carry the doc-tip attribute, which the
      // <doc-tip> @attribute controller picks up and turns into a popover.
      // Only tokens with an entry get it — a tooltip that says nothing is
      // worse than no tooltip.
      if (t.type === "decorator") {
        const key = t.text.replace(/^@/, "");
        if (DECORATOR_HELP[key]) {
          return `<span class="tok-decorator" doc-tip="${key}">${escaped}</span>`;
        }
      }
      return `<span class="tok-${t.type}">${escaped}</span>`;
    })
    .join("");
}

/* ── Styles ── */

const styles = css`
  :host {
    display: block;
    margin-bottom: var(--space-4, 1rem);
  }

  /* Every code block is a punched card: the same treatment the landing page
     uses, so the motif is one thing used everywhere rather than a one-off. */
  .block {
    position: relative;
    background: var(--ground-sunk, #100f0b);
    border: 1px solid var(--warp-lit, #4a4839);
    border-radius: 0;
    overflow: hidden;
    font-size: 13px;
    /* Explicit px, not a multiplier: the gutter and the code must resolve to
       exactly the same line box or the holes walk off their lines. */
    line-height: 22px;
  }
  /* The clipped corner is how a card is oriented in the reader. */
  .block.as-card {
    clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%);
  }

  .caption {
    font-family: var(--font-mono, monospace);
    font-size: 0.6875rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-muted, #6d6858);
    margin-bottom: var(--space-3, 0.75rem);
  }

  /* Printed spec strip along the card's foot. */
  .foot {
    display: flex;
    gap: var(--space-6, 1.5rem);
    flex-wrap: wrap;
    padding: 11px 20px 11px 16px;
    border-top: 1px solid var(--warp, #33322a);
    font-family: var(--font-mono, monospace);
    font-size: 0.6875rem;
    letter-spacing: 0.06em;
    color: var(--text-muted, #6d6858);
  }

  /* The punch gutter — one position per line of code, punched where that line
     carries a decorator. Same rule as the hero card, so the motif means the
     same thing everywhere: a punch marks a line that instructs the machine.
     Decorative only in the sense that it is redundant with the code itself, so
     it is hidden from assistive tech. */
  /* Code and gutter are laid out side by side and share one line grid.
     The holes are GLYPHS in a <pre> with the same font and line-height as the
     code, which is the only way they stay aligned: an absolutely positioned
     column with a hard-coded line box drifted about 1px per line and was ~10px
     out by the bottom of a short snippet. */
  .body {
    display: flex;
    align-items: stretch;
  }

  .gutter {
    /* The gutter is a <pre> as well, so it must be excluded from the code
       column's flex rule or it grows to fill half the block. */
    flex: 0 0 auto;
    width: auto;
    margin: 0;
    padding: 14px 9px;
    border: none;
    border-right: 1px solid var(--warp, #33322a);
    border-radius: 0;
    background: rgba(0, 0, 0, 0.22);
    color: var(--warp-lit, #4a4839);
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    line-height: 22px;
    user-select: none;
    overflow: visible;
  }
  .gutter b {
    display: block;
    font-weight: 400;
    font-size: 13px;
    line-height: 22px;
  }
  .gutter b.on { color: var(--thread, #c4472f); }

  /* Only the code column flexes; min-width lets it shrink so long lines
     scroll inside the block instead of widening the page. */
  .body > pre:not(.gutter) {
    flex: 1;
    min-width: 0;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 12px 5px 16px;
    background: transparent;
    border-bottom: 1px solid var(--warp, #33322a);
  }

  .lang-label {
    font-family: var(--font-mono, monospace);
    font-size: 10px;
    font-weight: 500;
    color: var(--text-muted, #6d6858);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .copy-btn {
    /* Reserve the widest label so Copy -> Copied -> Failed does not resize the
       button and shove the header around. */
    min-width: 58px;
    text-align: center;
    background: none;
    border: 1px solid transparent;
    border-radius: 0;
    padding: 2px 8px;
    cursor: pointer;
    font-family: var(--font-mono, monospace);
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-muted, #6d6858);
    transition: color 0.15s ease, border-color 0.15s ease;
  }
  .copy-btn:hover {
    color: var(--text-primary, #e6e1d3);
    border-color: var(--warp-lit, #4a4839);
  }
  .copy-btn.ok {
    color: var(--ok, #7f9c5a);
    border-color: var(--ok, #7f9c5a);
  }
  .copy-btn.fail {
    color: var(--thread, #c4472f);
    border-color: var(--thread, #c4472f);
  }

  pre {
    margin: 0;
    /* Same font as the gutter. When this fell back to the generic monospace
       the two columns built different line-box struts — 23px here against
       22px there — and the holes walked one pixel further off their line with
       every row. */
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    line-height: 22px;
    padding: 14px 20px;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--warp-lit, #4a4839) transparent;
  }

  code {
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    line-height: 22px;
    color: var(--text-primary, #e6e1d3);
  }
  /* No token may alter the line box. */
  code [class^="tok-"] { font-size: inherit; line-height: inherit; }

  /* ── Token colours ──
     Tuned for the olive ground and kept to one warm/one cool family plus
     neutrals, so a snippet reads as one object rather than confetti.
     The decorator is the loudest token on purpose: it is the punch. */
  .tok-keyword    { color: #b98b6a; }
  .tok-decorator  { color: #d9603f; font-weight: 600; }
  /* Explained decorators advertise themselves as hoverable. */
  .tok-decorator[doc-tip] {
    cursor: help;
    text-decoration: underline dotted;
    text-underline-offset: 3px;
    text-decoration-color: color-mix(in srgb, #d9603f 45%, transparent);
  }
  .tok-decorator[doc-tip]:hover,
  .tok-decorator[doc-tip]:focus-visible {
    text-decoration-color: #d9603f;
    outline: none;
  }
  .tok-string     { color: #93a86a; }
  .tok-comment    { color: #6d6858; font-style: italic; }
  .tok-type       { color: #8fa9c4; }
  .tok-number     { color: #c99a3d; }
  .tok-punctuation{ color: #6d6858; }
  .tok-ident      { color: #e6e1d3; }
  .tok-variable   { color: #8fa9c4; }
  .tok-flag       { color: #c99a3d; }
  .tok-tag        { color: #b98b6a; }
  .tok-key        { color: #8fa9c4; }
`;

/* ── Component ── */

@component("code-block")
export class CodeBlock extends LoomElement {
  @prop accessor lang = "ts";
  @prop accessor code = "";
  /** Render as a punched card: clipped corner and a printed caption. */
  @prop accessor card = false;
  /** Caption printed above a card, e.g. "Card 01". */
  @prop accessor caption = "";
  /** Comma-separated spec items printed along the card's foot. */
  @prop accessor foot = "";

  /** "idle" | "ok" | "fail" — drives the copy button label. */
  @reactive accessor copyState: "idle" | "ok" | "fail" = "idle";

  @mount
  setup() {
    this.shadow.adoptedStyleSheets = [styles];
  }

  private async copyCode() {
    // Reactive state rather than poking textContent: the old version wrote
    // straight into the button, so any re-render wiped the confirmation, and
    // a rejected clipboard write was swallowed with no feedback at all.
    try {
      await navigator.clipboard.writeText(this.code);
      this.copyState = "ok";
    } catch {
      this.copyState = "fail";
    }
    this.resetCopy();
  }

  /** @debounce defers the reset and is cancelled if the block unmounts. */
  @debounce(1600)
  private resetCopy() {
    this.copyState = "idle";
  }

  update() {
    const trimmed = this.code.replace(/^\n+|\n+$/g, "");
    const html = highlight(trimmed, this.lang);
    // A line is punched when it carries a decorator, matching the hero card.
    const punched = trimmed.split("\n").map((l) => /^\s*@[A-Za-z_$]/.test(l));

    const label =
      this.copyState === "ok" ? "Copied" :
      this.copyState === "fail" ? "Failed" : "Copy";
    const foots = this.foot.split(",").map((f) => f.trim()).filter(Boolean);

    return (
      <div>
        {this.caption ? <div class="caption">{this.caption}</div> : null}
        <div class={`block ${this.card ? "as-card" : ""}`}>
        <div class="header">
          <span class="lang-label">{this.lang}</span>
          <button
            class={`copy-btn ${this.copyState !== "idle" ? this.copyState : ""}`}
            onClick={() => this.copyCode()}
          >{() => label}</button>
        </div>
        <div class="body">
          <pre class="gutter" aria-hidden="true">
            {punched.map((on) => <b class={on ? "on" : ""}>{on ? "\u25A0" : "\u25A1"}</b>)}
          </pre>
          <pre><code rawHTML={html}></code></pre>
        </div>
        {foots.length ? (
          <div class="foot">
            {foots.map((f) => <span>{f}</span>)}
          </div>
        ) : null}
        </div>
      </div>
    );
  }
}
