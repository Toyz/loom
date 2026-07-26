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
        <doc-header title="@log" subtitle="Structured method logging with pluggable transports. Same DI pattern as RpcTransport in loom-rpc."></doc-header>

        <section>
          <p>Debug logging that ships is usually a <span class="ic">console.log</span> someone forgot, and debug logging that does not ship is usually deleted before it was useful twice. Neither gives you the two things you actually want at 3am: which arguments went in, and how long the call took.</p>
          <p><span class="ic">@log</span> wraps the method and records both. The transport is pluggable, so the same declaration writes to the console in development and to whatever you use in production — or to nothing at all.</p>
        </section>

        <doc-section heading="Quick Start">
          <code-block lang="ts" code={QUICK_START}></code-block>
        </doc-section>
        <doc-section heading="API">
          <api-entry sig="@log">
            <p>
              Log with default level <span class="ic">info</span>.
            </p>
          </api-entry>
          <api-entry sig="@log(level)">
            <p>
              Log with a specific level: <span class="ic">"debug"</span>, <span class="ic">"info"</span>, <span class="ic">"warn"</span>, or <span class="ic">"error"</span>.
            </p>
          </api-entry>
          <api-entry sig="@log(options)">
            <p>
              Full options object with <span class="ic">level</span>, <span class="ic">label</span>, <span class="ic">includeArgs</span>, and <span class="ic">skipArgs</span>.
            </p>
          </api-entry>
            <p>
              <strong>Options:</strong>
            </p>
            <table class="api-table">
              <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td><code>level</code></td><td>LogLevel</td><td>"info"</td><td>Log severity</td></tr>
                <tr><td><code>label</code></td><td>string</td><td>—</td><td>Custom label in log output</td></tr>
                <tr><td><code>includeArgs</code></td><td>boolean</td><td>true</td><td>Include method arguments in the log entry</td></tr>
                <tr><td><code>skipArgs</code></td><td>number[] | Record</td><td>—</td><td>Selectively redact args by index or nested keys</td></tr>
              </tbody>
            </table>
        </doc-section>
        <doc-section heading="LogEntry">
            <p>
              Every <span class="ic">@log</span> call sends a structured <span class="ic">LogEntry</span> to the transport:
            </p>
            <code-block lang="ts" code={LOG_ENTRY}></code-block>
        </doc-section>
        <doc-section heading="Transports">
          <api-entry sig="LogTransport (abstract)">
            <p>
              Implement this class and register via DI. Same pattern as <span class="ic">RpcTransport</span> in loom-rpc.
            </p>
            <code-block lang="ts" code={TRANSPORT}></code-block>
          </api-entry>
          <api-entry sig="ConsoleTransport (built-in)">
            <p>
              Styled console output with component name, method, args, and duration.
            </p>
            <code-block lang="ts" code={CONSOLE_TRANSPORT}></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="Custom Transport: Sentry">
          <code-block lang="ts" code={SENTRY_EXAMPLE}></code-block>
        </doc-section>
        <doc-section heading="Arg Redaction">
            <p>
              Use <span class="ic">includeArgs</span> and <span class="ic">skipArgs</span> to
              control what gets logged. Supports full opt-out, index-based redaction, and
              nested dot-path key redaction for object arguments.
            </p>
            <code-block lang="ts" code={SKIP_ARGS_EXAMPLE}></code-block>
        </doc-section>
        <doc-section heading="How It Works">
          <ul>
            <li>Resolves <span class="ic">LogTransport</span> from DI via <span class="ic">app.maybe()</span> — no-op if none registered</li>
            <li>Wraps the method via <span class="ic">addInitializer</span> — each instance gets its own wrapper</li>
            <li>Captures args, start time, and return value (or error)</li>
            <li>Async methods log after the Promise resolves or rejects</li>
            <li>Errors always log at <span class="ic">"error"</span> level regardless of configured level</li>
          </ul>
          <doc-notification type="note">
            Zero-config safe — if no <span class="ic">LogTransport</span> is registered, <span class="ic">@log</span> is a transparent pass-through with no overhead.
          </doc-notification>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}

const QUICK_START = `import { app } from "@toyz/loom";
import { LogTransport, ConsoleTransport, log } from "@toyz/loom/element";

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

const CONSOLE_TRANSPORT = `import { app } from "@toyz/loom";
import { LogTransport, ConsoleTransport } from "@toyz/loom/element";

app.use(LogTransport, new ConsoleTransport());
// Output: [my-search] open() args: [...] → result (1.2ms)`;

const SENTRY_EXAMPLE = `import * as Sentry from "@sentry/browser";
import { type LogEntry } from "@toyz/loom";
import { LogTransport } from "@toyz/loom/element";

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
