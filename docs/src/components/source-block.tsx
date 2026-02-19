/**
 * <source-block> — Live source code from GitHub.
 *
 * Fetches the actual file from the repo via GitHub raw API,
 * so docs source snippets are always in sync with the codebase.
 *
 * Usage:
 *   <source-block file="docs/src/pages/examples/components/live-clock.tsx"></source-block>
 *   <source-block file="src/element/image.ts" lang="ts"></source-block>
 */
import { LoomElement, component, prop, css, styles, mount } from "@toyz/loom";
import { api, intercept } from "@toyz/loom";
import type { ApiState, ApiCtx } from "@toyz/loom";

const sheet = css`
  :host { display: block; }
  .loading {
    padding: 2rem;
    text-align: center;
    color: var(--text-muted, #666);
    font-size: 0.85rem;
    font-family: var(--font-mono, 'JetBrains Mono', monospace);
    background: #0d0d14;
    border: 1px solid var(--border-subtle, #1e1e2a);
    border-radius: var(--radius-md, 8px);
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 1; }
  }
  .error {
    padding: 1rem;
    color: #f87171;
    font-size: 0.85rem;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
    border-radius: 8px;
  }
`;

const REPO = "Toyz/loom";
const BRANCH = "main";

@component("source-block")
@styles(sheet)
export class SourceBlock extends LoomElement {
  /** Repo-relative file path, e.g. "docs/src/pages/examples/components/live-clock.tsx" */
  @prop accessor file = "";

  /** Language for syntax highlighting (default: inferred from extension) */
  @prop accessor lang = "";

  @intercept({ after: true })
  async text(ctx: ApiCtx) {
    const code = await (ctx.response as any as Response).text();
    return { code };
  }

  @api<{ code: string }>({
    fn: ((el: any) =>
      fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${el.file}`)
    ) as any,
    pipe: ["text"],
    staleTime: 300_000, // 5 min cache
  })
  accessor source!: ApiState<{ code: string }>;

  /** Infer lang from file extension if not explicitly set */
  private get effectiveLang(): string {
    if (this.lang) return this.lang;
    const ext = this.file.split(".").pop() ?? "";
    const map: Record<string, string> = {
      ts: "ts", tsx: "tsx", js: "js", jsx: "jsx",
      json: "json", html: "html", css: "css",
      sh: "bash", bash: "bash",
    };
    return map[ext] ?? "ts";
  }

  update() {
    if (!this.file) {
      return <div class="error"><loom-icon name="alert-triangle" size={14} color="#f87171" /> No file specified</div>;
    }

    return this.source.match({
      loading: () => <div class="loading">loading source…</div>,
      ok: ({ code }) => (
        <code-block lang={this.effectiveLang} code={code}></code-block>
      ),
      err: (e) => (
        <div class="error"><loom-icon name="alert-triangle" size={14} color="#f87171" /> Failed to load {this.file}: {e.message}</div>
      ),
    });
  }
}
