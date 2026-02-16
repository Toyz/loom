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

  .block {
    background: #0d0d14;
    border: 1px solid var(--border-subtle, #1e1e2a);
    border-radius: var(--radius-md, 8px);
    overflow: hidden;
    font-size: 13px;
    line-height: 1.7;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 16px;
    background: rgba(255,255,255,0.02);
    border-bottom: 1px solid var(--border-subtle, #1e1e2a);
  }

  .lang-label {
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted, #5e5e74);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .copy-btn {
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    padding: 2px 8px;
    cursor: pointer;
    font-family: var(--font-mono, monospace);
    font-size: 11px;
    color: var(--text-muted, #5e5e74);
    transition: all 0.15s ease;
  }
  .copy-btn:hover {
    color: var(--text-secondary, #9898ad);
    border-color: var(--border-muted, #2a2a3a);
    background: rgba(255,255,255,0.03);
  }
  .copy-btn.copied {
    color: var(--emerald, #34d399);
  }

  pre {
    margin: 0;
    padding: 16px 20px;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.06) transparent;
  }

  code {
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', monospace);
    font-size: 13px;
    color: var(--text-primary, #e8e8f0);
  }

  /* ── Token colors ── */
  .tok-keyword    { color: #c084fc; }
  .tok-decorator  { color: #818cf8; font-weight: 500; }
  .tok-string     { color: #86efac; }
  .tok-comment    { color: #5e5e74; font-style: italic; }
  .tok-type       { color: #67e8f9; }
  .tok-number     { color: #fbbf24; }
  .tok-punctuation{ color: #6b7280; }
  .tok-ident      { color: #e8e8f0; }
  .tok-variable   { color: #67e8f9; }
  .tok-flag       { color: #fbbf24; }
  .tok-tag        { color: #f472b6; }
  .tok-key        { color: #67e8f9; }
`;

/* ── Component ── */

@component("code-block")
export class CodeBlock extends LoomElement {
  @prop lang = "ts";
  @prop code = "";

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
