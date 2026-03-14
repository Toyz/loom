/**
 * RPC Demo — Live interactive component
 *
 * Dogfoods @toyz/loom-rpc with MockTransport — no server needed.
 * Shows @rpc queries, @mutate mutations, @stream events, loading states, and error handling.
 */
import { LoomElement, component, css, reactive, styles, app } from "@toyz/loom";
import type { ApiState } from "@toyz/loom/query";
import { rpc, mutate, stream, onStream, RpcTransport, service } from "@toyz/loom-rpc";
import type { RpcMutator, RpcStream } from "@toyz/loom-rpc";
import { MockTransport } from "@toyz/loom-rpc/testing";
import { scrollbar } from "../../../shared/scrollbar";

// ── Contracts ──

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
}

@service("UserService")
class UserRouter {
  getUser(id: string): User { return null!; }
  listUsers(): User[] { return null!; }
  updateRole(id: string, role: "admin" | "member"): User { return null!; }
}

interface ChatMsg { id: number; user: string; text: string; }

@service("ChatService")
class ChatRouter {
  events(room: string): AsyncIterable<ChatMsg> { return null!; }
}

// ── Mock setup ──

const MOCK_USERS: User[] = [
  { id: "1", name: "Alice Chen", email: "alice@loom.dev", role: "admin" },
  { id: "2", name: "Bob Martinez", email: "bob@loom.dev", role: "member" },
  { id: "3", name: "Charlie Park", email: "charlie@loom.dev", role: "member" },
  { id: "4", name: "Diana Osei", email: "diana@loom.dev", role: "admin" },
];

const STREAM_MSGS: Pick<ChatMsg, "user" | "text">[] = [
  { user: "alice",   text: "Hey team 👋" },
  { user: "bob",     text: "What's shipping?" },
  { user: "charlie", text: "Just merged the stream PR!" },
  { user: "diana",   text: "All green 🟢" },
  { user: "alice",   text: "Let's ship it 🚀" },
  { user: "bob",     text: "Ping!" },
  { user: "charlie", text: "Pong!" },
  { user: "diana",   text: "Stream keeps going 📡" },
];

// Extends MockTransport so @rpc/.call() still works, adds stream() for @stream
class DemoTransport extends MockTransport {
  stream<T>(router: string, _method: string, _args: any[]): AsyncIterable<T> {
    if (router !== "ChatService") throw new Error("No stream for " + router);
    return {
      [Symbol.asyncIterator](): AsyncIterator<T> {
        let i = 0;
        let stopped = false;
        return {
          async next() {
            if (stopped || i >= STREAM_MSGS.length)
              return { value: undefined as any, done: true };
            await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
            if (stopped) return { value: undefined as any, done: true };
            const m = STREAM_MSGS[i++];
            return { value: { id: i, ...m } as any, done: false };
          },
          return() {
            stopped = true;
            return Promise.resolve({ value: undefined as any, done: true });
          },
        };
      },
    };
  }
}

const transport = new DemoTransport();
transport
  .mock(UserRouter, "listUsers", () => [...MOCK_USERS])
  .mock(UserRouter, "getUser", (id: string) => {
    const user = MOCK_USERS.find(u => u.id === id);
    if (!user) throw new Error(`User ${id} not found`);
    return { ...user };
  })
  .mock(UserRouter, "updateRole", (id: string, role: "admin" | "member") => {
    const user = MOCK_USERS.find(u => u.id === id);
    if (!user) throw new Error(`User ${id} not found`);
    user.role = role;
    return { ...user };
  })
  .delay(UserRouter, "listUsers", 400)
  .delay(UserRouter, "getUser", 250)
  .delay(UserRouter, "updateRole", 600);

app.use(RpcTransport, transport);

// ── Styles ──

const demoStyles = css`
  :host {
    display: block;
  }

  .demo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 1rem;
  }

  @media (max-width: 768px) {
    .demo-grid { grid-template-columns: 1fr; }
  }

  .panel {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .panel h3 {
    margin: 0 0 1rem;
    font-size: 0.95rem;
    color: #a78bfa;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .panel h3 .badge {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: rgba(167,139,250,0.15);
    color: #c4b5fd;
    font-weight: 600;
  }

  .user-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 0.75rem;
    border-radius: 8px;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 0.5rem;
    transition: all 0.2s;
  }

  .user-card:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(167,139,250,0.2);
  }

  .user-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
    color: #fff;
    flex-shrink: 0;
  }

  .user-info {
    flex: 1;
    min-width: 0;
  }

  .user-name {
    font-weight: 600;
    font-size: 0.85rem;
    color: #e2e8f0;
  }

  .user-email {
    font-size: 0.75rem;
    color: #64748b;
  }

  .role-badge {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    outline: none;
  }

  .role-badge.admin {
    background: rgba(251,146,60,0.15);
    color: #fb923c;
  }

  .role-badge.member {
    background: rgba(52,211,153,0.15);
    color: #34d399;
  }

  .role-badge:hover {
    transform: scale(1.05);
    filter: brightness(1.2);
  }

  .skeleton {
    background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
    height: 54px;
    margin-bottom: 0.5rem;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .error-box {
    padding: 0.75rem;
    border-radius: 8px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.2);
    color: #f87171;
    font-size: 0.85rem;
  }

  .detail-panel {
    min-height: 200px;
  }

  .detail-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 180px;
    color: #475569;
    font-size: 0.85rem;
    font-style: italic;
  }

  .detail-card {
    text-align: center;
    padding: 1.5rem 1rem;
  }

  .detail-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 1.5rem;
    color: #fff;
    margin: 0 auto 1rem;
  }

  .detail-name {
    font-weight: 700;
    font-size: 1.15rem;
    color: #e2e8f0;
    margin-bottom: 0.25rem;
  }

  .detail-email {
    font-size: 0.85rem;
    color: #64748b;
    margin-bottom: 1rem;
  }

  .btn-row {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  button {
    background: rgba(167,139,250,0.12);
    color: #c4b5fd;
    border: 1px solid rgba(167,139,250,0.2);
    padding: 0.4rem 0.85rem;
    border-radius: 8px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }

  button:hover:not(:disabled) {
    background: rgba(167,139,250,0.2);
    border-color: rgba(167,139,250,0.35);
  }

  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  button.primary {
    background: rgba(167,139,250,0.2);
    border-color: rgba(167,139,250,0.35);
  }

  button.danger {
    background: rgba(239,68,68,0.1);
    color: #f87171;
    border-color: rgba(239,68,68,0.2);
  }

  button.danger:hover:not(:disabled) {
    background: rgba(239,68,68,0.18);
  }

  .status-bar {
    margin-top: 1rem;
    font-size: 0.75rem;
    color: #475569;
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .status-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-right: 0.35rem;
    vertical-align: middle;
  }

  .status-dot.green { background: #34d399; }
  .status-dot.yellow { background: #fbbf24; }
  .status-dot.red { background: #f87171; }

  .log-panel {
    grid-column: 1 / -1;
  }

  .log-entries {
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.75rem;
    max-height: 150px;
    overflow-y: auto;
    padding: 0.75rem;
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    line-height: 1.6;
  }

  .log-entry { color: #64748b; }
  .log-entry .method { color: #a78bfa; }
  .log-entry .args { color: #34d399; }
  .log-entry .time { color: #475569; }

  /* ── Stream panel ── */
  .stream-panel { grid-column: 1 / -1; }

  .stream-feed {
    max-height: 160px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.75rem;
    background: rgba(0,0,0,0.25);
    border-radius: 8px;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.75rem;
    line-height: 1.6;
  }

  .stream-msg { display: flex; gap: 0.5rem; animation: msg-in 0.2s ease; }
  @keyframes msg-in {
    from { opacity: 0; transform: translateX(-4px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .stream-user { color: #a78bfa; font-weight: 600; min-width: 70px; }
  .stream-text { color: #94a3b8; }

  .stream-status {
    display: inline-flex; align-items: center; gap: 0.35rem;
    font-size: 0.7rem; padding: 0.15rem 0.55rem;
    border-radius: 999px; font-weight: 600;
  }
  .stream-status.idle      { background: rgba(100,116,139,0.15); color: #64748b; }
  .stream-status.streaming { background: rgba(52,211,153,0.15);  color: #34d399; }
  .stream-status.closed    { background: rgba(251,191,36,0.15);  color: #fbbf24; }
  .stream-status.error     { background: rgba(239,68,68,0.15);   color: #f87171; }

  .s-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: currentColor; animation: sdot 1.4s ease-in-out infinite;
  }
  @keyframes sdot { 0%,100%{opacity:1} 50%{opacity:0.3} }
`;

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

@component("rpc-demo")
@styles(demoStyles, scrollbar)
class RpcDemo extends LoomElement {
  @reactive accessor selectedId: string | null = null;
  @reactive accessor logs: string[] = [];
  @reactive accessor streamMsgs: ChatMsg[] = [];

  @rpc(UserRouter, "listUsers")
  accessor users!: ApiState<User[]>;

  @rpc(UserRouter, "getUser", {
    fn: (el: RpcDemo): [string] => [el.selectedId ?? "1"],
    eager: false,
  })
  accessor selectedUser!: ApiState<User>;

  @mutate(UserRouter, "updateRole")
  accessor toggleRole!: RpcMutator<[string, "admin" | "member"], User>;

  @stream(ChatRouter, "events", { fn: (): [string] => ["general"] })
  accessor chatFeed!: RpcStream<ChatMsg>;

  @onStream("chatFeed")
  onChatEvent(msg: ChatMsg) {
    this.streamMsgs = [...this.streamMsgs.slice(-50), msg];
    requestAnimationFrame(() => {
      const el = this.shadowRoot?.querySelector(".stream-feed");
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  private log(msg: string) {
    const time = new Date().toLocaleTimeString("en", { hour12: false });
    this.logs = [...this.logs.slice(-20), `[${time}] ${msg}`];
  }

  selectUser(id: string) {
    this.selectedId = id;
    this.log(`@rpc getUser(${id})`);
    this.selectedUser.refetch();
  }

  async handleToggleRole(user: User) {
    const newRole = user.role === "admin" ? "member" : "admin";
    this.log(`@mutate updateRole(${user.id}, ${newRole})`);
    try {
      await this.toggleRole.call(user.id, newRole);
      this.log(`✓ Role updated to ${newRole}`);
      this.users.refetch();
      if (this.selectedId === user.id) this.selectedUser.refetch();
    } catch (e: any) {
      this.log(`✗ Error: ${e.message}`);
    }
  }

  avatarColor(id: string) {
    return COLORS[parseInt(id) % COLORS.length];
  }

  renderUserCard(user: User) {
    const initial = user.name.charAt(0);
    return (
      <div
        class="user-card"
        onClick={() => this.selectUser(user.id)}
        style={{ cursor: "pointer" }}
      >
        <div class="user-avatar" style={{ background: this.avatarColor(user.id) }}>
          {initial}
        </div>
        <div class="user-info">
          <div class="user-name">{user.name}</div>
          <div class="user-email">{user.email}</div>
        </div>
        <button
          class={`role-badge ${user.role}`}
          onClick={(e: Event) => {
            e.stopPropagation();
            this.handleToggleRole(user);
          }}
          disabled={this.toggleRole.loading}
        >
          {user.role}
        </button>
      </div>
    );
  }

  renderSkeletons(count: number) {
    return Array.from({ length: count }, () => <div class="skeleton"></div>);
  }

  update() {
    return (
      <div>
        <div class="demo-grid">
          {/* Left: User List */}
          <div class="panel">
            <h3>
              User List <span class="badge">@rpc</span>
            </h3>

            {this.users.match({
              loading: () => this.renderSkeletons(4),
              ok: (users) => users.map(u => this.renderUserCard(u)),
              err: (e) => [<div class="error-box">{e.message}</div>],
            })}

            <div class="btn-row">
              <button onClick={() => { this.log("refetch listUsers"); this.users.refetch(); }}>
                Refetch
              </button>
              <button onClick={() => { this.log("invalidate listUsers"); this.users.invalidate(); }}>
                Invalidate
              </button>
            </div>

            <div class="status-bar">
              <span>
                <span class={`status-dot ${this.users.ok ? "green" : this.users.loading ? "yellow" : "red"}`}></span>
                {this.users.loading ? "Loading" : this.users.ok ? "OK" : "Error"}
              </span>
              {this.users.stale && <span>STALE</span>}
            </div>
          </div>

          {/* Right: User Detail */}
          <div class="panel detail-panel">
            <h3>
              User Detail <span class="badge">@rpc + fn</span>
            </h3>

            {!this.selectedId ? (
              <div class="detail-empty">Click a user to load their details</div>
            ) : (
              this.selectedUser.match({
                loading: () => this.renderSkeletons(2),
                ok: (user) => [
                  <div class="detail-card">
                    <div class="detail-avatar" style={{ background: this.avatarColor(user.id) }}>
                      {user.name.charAt(0)}
                    </div>
                    <div class="detail-name">{user.name}</div>
                    <div class="detail-email">{user.email}</div>
                    <button
                      class={`role-badge ${user.role}`}
                      style={{ fontSize: "0.85rem", padding: "0.3rem 1rem" }}
                      onClick={() => this.handleToggleRole(user)}
                      disabled={this.toggleRole.loading}
                    >
                      {this.toggleRole.loading ? "Updating..." : user.role}
                    </button>
                    <div class="btn-row">
                      <button onClick={() => this.selectedUser.refetch()}>
                        Refetch
                      </button>
                    </div>
                  </div>,
                ],
                err: (e) => [<div class="error-box">{e.message}</div>],
              })
            )}
          </div>

          {/* Bottom: Transport Log */}
          <div class="panel log-panel">
            <h3>
              Transport Log <span class="badge">MockTransport</span>
            </h3>
            <div class="log-entries">
              {this.logs.length === 0 ? (
                <div class="log-entry">Waiting for RPC calls...</div>
              ) : (
                this.logs.map(l => <div class="log-entry">{l}</div>)
              )}
            </div>
          </div>

          {/* Stream Feed */}
          <div class="panel stream-panel">
            <h3>
              Live Stream{" "}
              <span class="badge">@stream + @onStream</span>
              {" "}
              <span class={`stream-status ${this.chatFeed?.status ?? "idle"}`}>
                {this.chatFeed?.status === "streaming" && <span class="s-dot"></span>}
                {this.chatFeed?.status ?? "idle"}
              </span>
            </h3>
            <div class="stream-feed">
              {this.streamMsgs.length === 0 ? (
                <span style={{ color: "#475569", fontStyle: "italic" }}>Waiting for events…</span>
              ) : (
                this.streamMsgs.map(m => (
                  <div class="stream-msg">
                    <span class="stream-user">{m.user}</span>
                    <span class="stream-text">{m.text}</span>
                  </div>
                ))
              )}
            </div>
            <div class="btn-row">
              <button
                onClick={() => this.chatFeed.open()}
                disabled={this.chatFeed?.status === "streaming"}
              >
                Open
              </button>
              <button
                class="danger"
                onClick={() => this.chatFeed.close()}
                disabled={this.chatFeed?.status !== "streaming"}
              >
                Close
              </button>
              <button onClick={() => { this.streamMsgs = []; }}>Clear</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
