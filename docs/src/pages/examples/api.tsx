/**
 * Example — @api Data Fetching
 *
 * Live demo: @api, createApiState, ApiState<T>
 */
import { LoomElement } from "@toyz/loom";
import "./components/api-demo";

export default class ExampleApi extends LoomElement {
  update() {
    return (
      <div>
        <h1>@api — Data Fetching</h1>
        <p class="subtitle">
          A live team roster built with <span class="ic">createApiState</span> and a static JSON endpoint.
        </p>

        <section>
          <h2>Demo</h2>
          <p>
            This component fetches <span class="ic">/api/team.json</span> on mount.
            Use the buttons to refetch or invalidate the cache and see the state transitions.
          </p>
          <api-demo></api-demo>
        </section>

        <section>
          <h2>What This Shows</h2>
          <ul>
            <li><span class="ic">createApiState</span> — Factory for managing fetch lifecycle</li>
            <li><span class="ic">ApiState&lt;T&gt;</span> — Reactive state with <code>data</code>, <code>loading</code>, <code>error</code>, <code>stale</code></li>
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

const SOURCE = `import { LoomElement, component, mount, css, createApiState } from "@toyz/loom";
import type { ApiState } from "@toyz/loom";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  avatar: string;
}

const sheet = css\`
  .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
  .card      { background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; }
\`;

@component("api-demo")
class ApiDemo extends LoomElement {
  private state: ApiState<TeamMember[]> | null = null;

  @mount
  setup() {
    this.shadow.adoptedStyleSheets = [sheet];
    this.state = createApiState<TeamMember[]>(
      { fn: () => fetch("/api/team.json").then(r => r.json()) },
      () => this.scheduleUpdate(),
      this,
    );
  }

  update() {
    const q = this.state;
    if (!q) return <div />;

    if (q.loading) return <div>Loading…</div>;
    if (q.error)   return <div class="error">{q.error.message}</div>;

    return (
      <div>
        <button onClick={() => q.refetch()}>↻ Refetch</button>
        <div class="card-grid">
          {q.data!.map(m => (
            <div class="card">
              <div>{m.avatar}</div>
              <div>{m.name}</div>
              <div>{m.role}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}`;
