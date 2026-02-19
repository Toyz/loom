/**
 * Virtual List Demo Component
 *
 * Live demo: 10,000 items rendered via <loom-virtual>
 */
import { LoomElement, component, reactive, css, styles } from "@toyz/loom";
import "@toyz/loom/element/virtual";
import "./person-row";
import { scrollbar } from "../../../shared/scrollbar";

const sheet = css`
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
    font-size: 0.85rem;
    transition: border-color 0.2s, background 0.2s;
  }
  .controls button:hover {
    border-color: var(--accent);
    background: var(--surface-3, #222);
  }
  .count {
    font-size: 0.8rem; color: var(--text-muted);
    margin-left: auto;
    font-family: var(--font-mono);
  }
  loom-virtual {
    display: block;
    height: 400px;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.65rem 1rem;
    border-bottom: 1px solid var(--border, #1a1a2e);
    font-size: 0.9rem;
    transition: background 0.15s;
  }
  .row:hover { background: var(--surface-2, #1a1a2e); }
  .idx {
    font-family: var(--font-mono, monospace);
    font-size: 0.75rem;
    color: var(--text-muted, #666);
    min-width: 4ch;
    text-align: right;
  }
  .name { flex: 1; }
  .tag {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    background: var(--accent-glow, #1a1a2e);
    color: var(--accent, #c084fc);
    border: 1px solid var(--accent-dim, #333);
  }
`;

interface Person {
  id: number;
  name: string;
  role: string;
}

const ROLES = ["Engineer", "Designer", "PM", "QA", "DevOps", "Data", "Security", "Intern"];
const FIRST = ["Alice", "Bob", "Carla", "Dan", "Eve", "Fay", "Gus", "Hana", "Ike", "Jia"];
const LAST = ["Zhao", "Smith", "Patel", "Kim", "Borg", "Lee", "Davis", "Chen", "Roy", "Berg"];

function generate(n: number): Person[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    name: `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`,
    role: ROLES[i % ROLES.length],
  }));
}

@component("virtual-list-demo")
@styles(sheet, scrollbar)
export class VirtualListDemo extends LoomElement {
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
            <person-row pid={p.id} name={p.name} role={p.role}></person-row>
          )}
        </loom-virtual>
      </div>
    );
  }
}
