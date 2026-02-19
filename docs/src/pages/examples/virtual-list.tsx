/**
 * Example — Virtual List
 *
 * Live demo: <loom-virtual> rendering 10,000+ items
 */
import { LoomElement } from "@toyz/loom";
import "./components/virtual-list-demo";

export default class ExampleVirtualList extends LoomElement {
  update() {
    return (
      <div>
        <h1>Virtual List</h1>
        <p class="subtitle">
          Render 100k items without breaking a sweat.
        </p>

        <section>
          <h2>Demo</h2>
          <p class="hint" style="margin-bottom:0.75rem;color:var(--text-muted);font-size:0.85rem;">
            Switch between sizes — the list only renders what's visible. Scroll to see dynamic measurement in action.
          </p>
          <virtual-list-demo></virtual-list-demo>
        </section>

        <section>
          <h2>What This Shows</h2>
          <ul>
            <li><span class="ic">&lt;loom-virtual&gt;</span> — Windowed rendering for massive datasets</li>
            <li><span class="ic">Children template</span> — Render function as JSX children</li>
            <li><span class="ic">@reactive</span> — Declarative config via reactive state</li>
            <li><span class="ic">estimatedHeight</span> — Initial height estimate, auto-refined after paint</li>
            <li><span class="ic">Binary search</span> — O(log n) scroll position lookup</li>
            <li><span class="ic">Morph-aware props</span> — Changing <span class="ic">items</span> triggers automatic re-render</li>
            <li>Pure Loom — no imperative setup, just JSX</li>
          </ul>
        </section>

        <section>
          <h2>Source</h2>
          <code-block lang="tsx" code={SOURCE}></code-block>
        </section>
      </div>
    );
  }
}

const SOURCE = `import { LoomElement, component, reactive, css, styles } from "@toyz/loom";
import "@toyz/loom/element/virtual";

interface Person { id: number; name: string; role: string; }

const ROLES = ["Engineer", "Designer", "PM", "QA", "DevOps", "Data"];
const FIRST = ["Alice", "Bob", "Carla", "Dan", "Eve", "Fay", "Gus", "Hana"];
const LAST  = ["Zhao", "Smith", "Patel", "Kim", "Borg", "Lee", "Davis", "Chen"];

function generate(n: number): Person[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    name: \`\${FIRST[i % FIRST.length]} \${LAST[Math.floor(i / FIRST.length) % LAST.length]}\`,
    role: ROLES[i % ROLES.length],
  }));
}

const sheet = css\`
  :host { display: block; }
  .controls {
    display: flex; gap: 0.5rem; margin-bottom: 1rem;
    flex-wrap: wrap; align-items: center;
  }
  .controls button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-2);
    color: var(--text);
    cursor: pointer;
  }
  .controls button:hover {
    border-color: var(--accent);
  }
  .count {
    font-size: 0.8rem; color: var(--text-muted);
    margin-left: auto; font-family: monospace;
  }

  /* The host element needs display: block + a fixed height */
  loom-virtual {
    display: block;
    height: 400px;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  .row {
    display: flex; align-items: center; gap: 1rem;
    padding: 0.65rem 1rem;
    border-bottom: 1px solid var(--border);
  }
  .row:hover { background: var(--surface-2); }
  .idx { font-family: monospace; font-size: 0.75rem; color: var(--text-muted); }
  .name { flex: 1; }
  .tag {
    font-size: 0.7rem; padding: 0.15rem 0.5rem;
    border-radius: 4px; background: var(--accent-glow);
    color: var(--accent); border: 1px solid var(--accent-dim);
  }
\\\`;

@component("my-list")
@styles(sheet)
class MyList extends LoomElement {
  @reactive accessor count = 10_000;
  @reactive accessor data: Person[] = generate(10_000);

  setCount(n: number) {
    this.count = n;
    this.data = generate(n);
  }

  update() {
    return (
      <div>
        <div class="controls">
          {[100, 1_000, 10_000, 100_000].map(n => (
            <button onClick={() => this.setCount(n)}>
              {n.toLocaleString()}
            </button>
          ))}
          <span class="count">{this.count.toLocaleString()} items</span>
        </div>
        <loom-virtual items={this.data} estimatedHeight={38}
                      pinToBottom={false}>
          {(p: Person) => (
            <div class="row">
              <span class="idx">{p.id}</span>
              <span class="name">{p.name}</span>
              <span class="tag">{p.role}</span>
            </div>
          )}
        </loom-virtual>
      </div>
    );
  }
}`;
