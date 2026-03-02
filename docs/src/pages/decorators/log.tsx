/**
 * Docs — @log decorator
 *
 * Reference page for @log — structured method logging with pluggable transports.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementLog extends LoomElement {
  update() {
    return (
      <div>
        <h1>@log</h1>
        <p class="subtitle">
          Structured method logging with pluggable transports.
          Same DI pattern as <span class="ic">RpcTransport</span> in loom-rpc.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Quick Start</h2>
          </div>
          <code-block lang="ts" code={QUICK_START}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--accent)"></loom-icon>
            <h2>API</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@log</div>
            <div class="dec-desc">
              Log with default level <span class="ic">info</span>.
            </div>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@log(level)</div>
            <div class="dec-desc">
              Log with a specific level: <span class="ic">"debug"</span>,{" "}
              <span class="ic">"info"</span>, <span class="ic">"warn"</span>,{" "}
              or <span class="ic">"error"</span>.
            </div>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@log(options)</div>
            <div class="dec-desc">
              Full options object with <span class="ic">level</span>,{" "}
              <span class="ic">label</span>, <span class="ic">includeArgs</span>,{" "}
              and <span class="ic">skipArgs</span>.
            </div>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              <strong>Options:</strong>
            </div>
            <table class="api-table">
              <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td><code>level</code></td><td>LogLevel</td><td>"info"</td><td>Log severity</td></tr>
                <tr><td><code>label</code></td><td>string</td><td>—</td><td>Custom label in log output</td></tr>
                <tr><td><code>includeArgs</code></td><td>boolean</td><td>true</td><td>Include method arguments in the log entry</td></tr>
                <tr><td><code>skipArgs</code></td><td>number[] | Record</td><td>—</td><td>Selectively redact args by index or nested keys</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--cyan)"></loom-icon>
            <h2>LogEntry</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Every <span class="ic">@log</span> call sends a structured{" "}
              <span class="ic">LogEntry</span> to the transport:
            </div>
            <code-block lang="ts" code={LOG_ENTRY}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--amber)"></loom-icon>
            <h2>Transports</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">LogTransport (abstract)</div>
            <div class="dec-desc">
              Implement this class and register via DI. Same pattern as{" "}
              <span class="ic">RpcTransport</span> in loom-rpc.
            </div>
            <code-block lang="ts" code={TRANSPORT}></code-block>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">ConsoleTransport (built-in)</div>
            <div class="dec-desc">
              Styled console output with component name, method, args, and duration.
            </div>
            <code-block lang="ts" code={CONSOLE_TRANSPORT}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="rocket" size={20} color="var(--rose)"></loom-icon>
            <h2>Custom Transport: Sentry</h2>
          </div>
          <code-block lang="ts" code={SENTRY_EXAMPLE}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="shield" size={20} color="var(--amber)"></loom-icon>
            <h2>Arg Redaction</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Use <span class="ic">includeArgs</span> and <span class="ic">skipArgs</span> to
              control what gets logged. Supports full opt-out, index-based redaction, and
              nested dot-path key redaction for object arguments.
            </div>
            <code-block lang="ts" code={SKIP_ARGS_EXAMPLE}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <ul>
            <li>Resolves <span class="ic">LogTransport</span> from DI via <span class="ic">app.maybe()</span> — no-op if none registered</li>
            <li>Wraps the method via <span class="ic">addInitializer</span> — each instance gets its own wrapper</li>
            <li>Captures args, start time, and return value (or error)</li>
            <li>Async methods log after the Promise resolves or rejects</li>
            <li>Errors always log at <span class="ic">"error"</span> level regardless of configured level</li>
          </ul>
          <div class="note">
            Zero-config safe — if no <span class="ic">LogTransport</span> is registered,{" "}
            <span class="ic">@log</span> is a transparent pass-through with no overhead.
          </div>
        </section>
      </div>
    );
  }
}

const QUICK_START = `import { app, LogTransport, ConsoleTransport, log } from "@toyz/loom";

// Register a transport
app.use(LogTransport, new ConsoleTransport());

// Decorate methods
@log
open() { this.isOpen = true; }

@log("warn")
deleteAll() { this.items = []; }

@log({ level: "debug", label: "Filter" })
onInput(e: Event) { ... }`;

const LOG_ENTRY = `interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  component: string;    // tag name (e.g. "my-search")
  method: string;       // method name
  label?: string;       // custom label from options
  args: unknown[];      // method arguments
  result?: unknown;     // return value
  error?: Error;        // thrown error
  duration: number;     // ms elapsed
  timestamp: number;    // Date.now()
}`;

const TRANSPORT = `abstract class LogTransport {
  abstract send(entry: LogEntry): void;
}

// Register via DI
app.use(LogTransport, new MyCustomTransport());`;

const CONSOLE_TRANSPORT = `import { app, LogTransport, ConsoleTransport } from "@toyz/loom";

app.use(LogTransport, new ConsoleTransport());
// Output: [my-search] open() args: [...] → result (1.2ms)`;

const SENTRY_EXAMPLE = `import * as Sentry from "@sentry/browser";
import { LogTransport, type LogEntry } from "@toyz/loom";

class SentryTransport extends LogTransport {
  send(entry: LogEntry) {
    if (entry.error) {
      Sentry.captureException(entry.error, {
        tags: { component: entry.component, method: entry.method },
        extra: { args: entry.args, duration: entry.duration },
      });
    } else if (entry.level === "warn" || entry.level === "error") {
      Sentry.captureMessage(
        \`[\${entry.component}] \${entry.method}()\`,
        entry.level,
      );
    }
  }
}

app.use(LogTransport, new SentryTransport());`;

const SKIP_ARGS_EXAMPLE = `// Omit all args
@log({ includeArgs: false })
login(user: string, pass: string) { ... }

// Redact specific arg indices
@log({ skipArgs: [1] })        // arg 1 → "[redacted]"
login(user: string, pass: string) { ... }

// Redact by index — true = fully redacted
@log({ skipArgs: { 0: true, 2: true } })
multi(secret: string, visible: string, hidden: string) { ... }

// Redact nested keys within object args
@log({ skipArgs: { 0: ["password", "token"] } })
submit(data: { username: string; password: string; token: string }) { ... }
// Logs: { username: "admin", password: "[redacted]", token: "[redacted]" }

// Dot-path for deeply nested objects
@log({ skipArgs: { 0: ["user.email", "user.ssn"] } })
process(data: { user: { name: string; email: string; ssn: string } }) { ... }
// Logs: { user: { name: "Alice", email: "[redacted]", ssn: "[redacted]" } }`;
