/**
 * Example component: api-demo
 *
 * Live demo of @api fetching /api/team.json
 */
import { LoomElement, component, css, styles, catch_ } from "@toyz/loom";
import { api, intercept } from "@toyz/loom";
import type { ApiState, ApiCtx } from "@toyz/loom";

interface TeamMember {
  name: string;
  role: string;
  initials: string;
}

const sheet = css`
  :host {
    display: block;
    font-family: "Inter", sans-serif;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .toolbar button {
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: inherit;
    cursor: pointer;
    font-size: 0.8rem;
    transition: background 0.2s;
  }

  .toolbar button:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .status {
    margin-left: auto;
    font-size: 0.75rem;
    opacity: 0.5;
  }

  .loading {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent, #818cf8);
    animation: pulse 1s infinite ease-in-out;
  }

  .dot:nth-child(2) { animation-delay: 0.15s; }
  .dot:nth-child(3) { animation-delay: 0.3s; }

  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.75rem;
  }

  .card {
    padding: 1rem;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    text-align: center;
    transition: transform 0.2s, background 0.2s;
  }

  .card:hover {
    transform: translateY(-2px);
    background: rgba(255, 255, 255, 0.06);
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent, #818cf8);
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .name { font-weight: 600; font-size: 0.9rem; }
  .role { font-size: 0.75rem; opacity: 0.5; margin-top: 0.25rem; }

  .error {
    color: #f87171;
    padding: 1rem;
    border-radius: 8px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
  }
`;

@component("api-demo")
@styles(sheet)
export class ApiDemo extends LoomElement {
  // Error boundary — scoped to the "team" @api accessor
  @catch_("team")
  handleError(err: unknown) {
    this.shadow.innerHTML = `<p style="color:#f87171;padding:1rem">Error: ${err}</p>`;
  }

  // Post-fetch interceptor: parses Response → JSON
  @intercept({ after: true })
  json(ctx: ApiCtx) {
    return (ctx.response as any as Response).json();
  }

  @api<TeamMember[]>({
    fn: (() => fetch(`${import.meta.env.BASE_URL}api/team.json`)) as any,
    pipe: ["json"],
  })
  accessor team!: ApiState<TeamMember[]>;

  update() {
    return this.team.match({
      loading: () => (
        <div class="loading">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
      ),
      ok: (team) => (
        <div>
          <div class="toolbar">
            <button onClick={() => this.team.refetch()}>↻ Refetch</button>
            <button onClick={() => this.team.invalidate()}>⟳ Invalidate</button>
            <span class="status">
              {this.team.stale ? "stale" : "fresh"} · {team.length} members
            </span>
          </div>
          <div class="card-grid">
            {team.map((m: TeamMember) => (
              <div class="card">
                <div class="avatar">{m.initials}</div>
                <div class="name">{m.name}</div>
                <div class="role">{m.role}</div>
              </div>
            ))}
          </div>
        </div>
      ),
      err: (e) => <div class="error">{e.message}</div>,
    });
  }
}
