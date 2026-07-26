/**
 * <code-block> — Syntax-highlighted code with line numbers.
 *
 * Usage:
 *   <code-block lang="ts" code={`const x = 1;`}></code-block>
 */
import { LoomElement, component, prop, css, mount } from "@toyz/loom";

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

  /* The code block is the card feed: a sunken well with a punched left edge,
     the way stock sits in the reader. Square corners — card stock is die-cut. */
  .block {
    position: relative;
    background: var(--ground-sunk, #100f0b);
    border: 1px solid var(--warp, #33322a);
    border-radius: 0;
    overflow: hidden;
    font-size: 13px;
    line-height: 1.7;
  }

  /* Sprocket margin: the feed holes down the left edge of the stock. Purely
     an edge treatment, so it is hidden from assistive tech by being a border
     image rather than content. */
  .block::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 14px;
    background-image: radial-gradient(
      circle at 7px center,
      var(--warp-lit, #4a4839) 0 1.5px,
      transparent 1.6px
    );
    background-size: 14px 13px;
    background-repeat: repeat-y;
    border-right: 1px solid var(--warp, #33322a);
    pointer-events: none;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 12px 5px 26px;
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
  .copy-btn.copied {
    color: var(--ok, #7f9c5a);
    border-color: var(--ok, #7f9c5a);
  }

  pre {
    margin: 0;
    padding: 14px 20px 14px 26px;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--warp-lit, #4a4839) transparent;
  }

  code {
    font-family: var(--font-mono, monospace);
    font-size: 13px;
    color: var(--text-primary, #e6e1d3);
  }

  /* ── Token colours ──
     Tuned for the olive ground and kept to one warm/one cool family plus
     neutrals, so a snippet reads as one object rather than confetti.
     The decorator is the loudest token on purpose: it is the punch. */
  .tok-keyword    { color: #b98b6a; }
  .tok-decorator  { color: #d9603f; font-weight: 600; }
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

  @mount
  setup() {
    this.shadow.adoptedStyleSheets = [styles];
  }

  private async copyCode() {
    try {
      await navigator.clipboard.writeText(this.code);
      const btn = this.shadow.querySelector(".copy-btn") as HTMLElement;
      if (btn) {
        btn.textContent = "Copied!";
        btn.classList.add("copied");
        setTimeout(() => {
          btn.textContent = "Copy";
          btn.classList.remove("copied");
        }, 1500);
      }
    } catch {}
  }

  update() {
    const trimmed = this.code.replace(/^\n+|\n+$/g, "");
    const html = highlight(trimmed, this.lang);

    return (
      <div class="block">
        <div class="header">
          <span class="lang-label">{this.lang}</span>
          <button class="copy-btn" onClick={() => this.copyCode()}>Copy</button>
        </div>
        <pre><code rawHTML={html}></code></pre>
      </div>
    );
  }
}
