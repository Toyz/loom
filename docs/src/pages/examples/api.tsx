/**
 * Example — @api Data Fetching
 *
 * Live demo: @api decorator, pipe interceptors, @catch_ error boundaries
 */
import { LoomElement } from "@toyz/loom";
import "./components/api-demo";

export default class ExampleApi extends LoomElement {
  update() {
    return (
      <div>
        <h1>@api — Data Fetching</h1>
        <p class="subtitle">
          Declarative async data with <span class="ic">@api</span>, response
          pipelines via <span class="ic">pipe</span>, and scoped error
          boundaries with <span class="ic">@catch_</span>.
        </p>

        <section>
          <h2>Demo</h2>
          <p>
            This component fetches <span class="ic">/api/team.json</span> using
            the <span class="ic">@api</span> decorator. Use the buttons to
            refetch or invalidate the cache and see the state transitions.
          </p>
          <api-demo></api-demo>
        </section>

        <section>
          <h2>What This Shows</h2>
          <ul>
            <li><span class="ic">@api</span> — Accessor decorator that manages the full fetch lifecycle</li>
            <li><span class="ic">pipe</span> — Post-fetch interceptor pipeline for response transformation</li>
            <li><span class="ic">@intercept</span> — Declares named interceptors as class methods</li>
            <li><span class="ic">@catch_("team")</span> — Scoped error boundary for a specific <code>@api</code> accessor</li>
            <li><span class="ic">@catch_</span> — General catch-all for render errors and any unscoped API failures</li>
            <li><span class="ic">.refetch()</span> — Re-runs the fetch; stale-while-revalidate keeps old data visible</li>
            <li><span class="ic">.invalidate()</span> — Marks data as stale and triggers refetch</li>
          </ul>
        </section>

        <section>
          <h2>Source</h2>
          <code-block lang="ts" code={SOURCE}></code-block>
        </section>
      </div>
    );
  }
}

const SOURCE = `import { LoomElement, component, css, styles, catch_ } from "@toyz/loom";
import { api, intercept } from "@toyz/loom";
import type { ApiState, ApiCtx } from "@toyz/loom";

interface TeamMember {
  name: string;
  role: string;
  initials: string;
}

const sheet = css\`
  :host { display: block; }
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.75rem;
  }
  .card {
    padding: 1rem; border-radius: 8px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    text-align: center;
  }
  .avatar {
    width: 40px; height: 40px; border-radius: 50%;
    background: var(--accent); color: white;
    display: inline-flex; align-items: center; justify-content: center;
    font-weight: 600; font-size: 0.85rem; margin-bottom: 0.5rem;
  }
  .name { font-weight: 600; font-size: 0.9rem; }
  .role { font-size: 0.75rem; opacity: 0.5; margin-top: 0.25rem; }
  .error { color: #f87171; padding: 1rem; border-radius: 8px; }
\`;

@component("api-demo")
@styles(sheet)
class ApiDemo extends LoomElement {
  // Scoped error boundary — only catches errors from the "team" accessor
  @catch_("team")
  handleTeamError(err: unknown) {
    this.shadow.innerHTML = \`<p>⚠ \${err}</p>\`;
  }

  // Post-fetch interceptor: Response → JSON
  @intercept({ after: true })
  json(ctx: ApiCtx) {
    return ctx.response.json();
  }

  // Declarative data fetching — no manual setup needed
  @api<TeamMember[]>({
    fn: () => fetch("/api/team.json"),
    pipe: ["json"],      // runs the @intercept method above after fetch
    staleTime: 30_000,   // data considered fresh for 30s
    retry: 2,            // retry up to 2 times on failure
  })
  accessor team!: ApiState<TeamMember[]>;

  update() {
    // Tri-state match — loading, ok, err in one call
    return this.team.match({
      loading: () => <div>Loading…</div>,
      ok:  (team) => (
        <div class="card-grid">
          {team.map(m => (
            <div class="card">
              <div class="avatar">{m.initials}</div>
              <div>{m.name}</div>
              <div>{m.role}</div>
            </div>
          ))}
        </div>
      ),
      err: (e) => <div class="error">{e.message}</div>,
    });
  }
}`;
