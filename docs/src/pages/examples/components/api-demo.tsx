/**
 * Example component: api-demo
 *
 * Live demo of @api fetching /api/team.json
 */
import { LoomElement, component, css, mount, styles } from "@toyz/loom";
import { createApiState } from "@toyz/loom";
import type { ApiState } from "@toyz/loom";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  initials: string;
}

const sheet = css`
  :host {
    display: block;
  }
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }
  .card {
    background: var(--surface-2, #1a1a26);
    border: 1px solid var(--border, #2a2a3a);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(129, 140, 248, 0.15);
  }
  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent, #818cf8), #a78bfa);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 8px;
    font-size: 0.85rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.04em;
  }
  .name {
    font-weight: 600;
    color: var(--text-primary, #e8e8f0);
    font-size: 0.95rem;
  }
  .role {
    color: var(--text-muted, #7a7a90);
    font-size: 0.8rem;
    margin-top: 4px;
  }
  .toolbar {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  }
  button {
    background: rgba(129, 140, 248, 0.12);
    border: 1px solid rgba(129, 140, 248, 0.2);
    color: var(--accent, #818cf8);
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    transition: background 0.15s ease;
  }
  button:hover {
    background: rgba(129, 140, 248, 0.2);
  }
  .status {
    font-size: 0.75rem;
    color: var(--text-muted, #7a7a90);
    font-family: var(--font-mono, monospace);
  }
  .loading {
    display: flex;
    gap: 8px;
    padding: 32px;
    justify-content: center;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent, #818cf8);
    animation: bounce 0.6s infinite alternate;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce {
    to { opacity: 0.3; transform: translateY(-6px); }
  }
  .error {
    color: #f87171;
    padding: 16px;
    border-radius: 8px;
    background: rgba(248, 113, 113, 0.08);
    border: 1px solid rgba(248, 113, 113, 0.2);
  }
`;

@component("api-demo")
@styles(sheet)
export class ApiDemo extends LoomElement {
  private state: ApiState<TeamMember[]> | null = null;

  @mount
  setup() {
    this.state = createApiState<TeamMember[]>(
      { fn: () => fetch(`${import.meta.env.BASE_URL}api/team.json`).then(r => r.json()) },
      () => this.scheduleUpdate(),
      this,
    );
    this.scheduleUpdate();
  }

  update() {
    const q = this.state;
    if (!q) return <div></div>;

    return (
      <div>
        <div class="toolbar">
          <button onClick={() => q.refetch()}>↻ Refetch</button>
          <button onClick={() => q.invalidate()}>⟳ Invalidate</button>
          <span class="status">
            {q.loading ? "loading..." : q.stale ? "stale" : "fresh"}
            {q.data ? ` · ${q.data.length} members` : ""}
          </span>
        </div>

        {q.loading && !q.data ? (
          <div class="loading">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        ) : q.error ? (
          <div class="error">{q.error.message}</div>
        ) : (
          <div class="card-grid">
            {q.data!.map((m: TeamMember) => (
              <div class="card">
                <div class="avatar">{m.initials}</div>
                <div class="name">{m.name}</div>
                <div class="role">{m.role}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
}
