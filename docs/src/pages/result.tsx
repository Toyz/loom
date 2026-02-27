/**
 * LoomResult<T, E> — /result
 *
 * Standalone top-level docs page for the Result type.
 */
import { LoomElement } from "@toyz/loom";

export default class PageResult extends LoomElement {
  update() {
    return (
      <div>
        <h1>LoomResult&lt;T, E&gt;</h1>
        <p class="subtitle">
          A Rust-inspired Result type for explicit, composable error handling.
          Used throughout the framework and available as a public utility.
        </p>

        <section>
          <div class="group-header">
            <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
            <h2>Why Result?</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              JavaScript's <span class="ic">try/catch</span> is invisible in the
              type system — a function that throws looks identical to one that
              doesn't. <span class="ic">LoomResult</span> makes errors{" "}
              <strong>visible, typed, and composable</strong>.
            </div>
            <code-block
              lang="ts"
              code={`// [BAD] try/catch — error handling is invisible
try {
  const data = await fetchTeam();
  render(data);
} catch (err) {
  // is this a network error? a parse error? a typo?
  console.error(err);
}

// [OK] LoomResult — errors are explicit values
const result = await LoomResult.fromPromise(fetchTeam());
result.match({
  ok:  (team) => render(team),
  err: (e)    => showError(e.message),
});`}
            ></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--accent)"></loom-icon>
            <h2>Creating Results</h2>
          </div>
          <code-block
            lang="ts"
            code={`import { LoomResult } from "@toyz/loom";

// Ok — wraps a success value
const ok = LoomResult.ok(42);        // LoomResult<number, never>

// Err — wraps an error
const error = LoomResult.err(
  new Error("not found")
);                                    // LoomResult<never, Error>

// Void Ok — for operations that succeed with no data
const done = LoomResult.ok();         // LoomResult<void, never>
const same = LoomResult.OK;           // pre-allocated, zero-cost

// From Promise — catches rejections automatically
const result = await LoomResult.fromPromise(
  fetch("/api/data")
);`}
          ></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="shield" size={20} color="var(--cyan)"></loom-icon>
            <h2>Narrowing</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              The <span class="ic">.ok</span> boolean is a discriminant —
              TypeScript narrows <span class="ic">.data</span> and{" "}
              <span class="ic">.error</span> automatically:
            </div>
            <code-block
              lang="ts"
              code={`const r = LoomResult.ok("hello");

if (r.ok) {
  r.data;   // -> string
  r.error;  // -> undefined
} else {
  r.error;  // -> Error
  r.data;   // -> undefined
}`}
            ></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--amber)"></loom-icon>
            <h2>Combinators</h2>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">unwrap() / unwrap_or()</div>
            <div class="dec-desc">
              Extract the value — <span class="ic">unwrap()</span> throws on Err,{" "}
              <span class="ic">unwrap_or()</span> returns a fallback.
            </div>
            <code-block
              lang="ts"
              code={`result.unwrap();        // T — throws the error if Err
result.unwrap_or([]);   // T — returns [] if Err`}
            ></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">map() / map_err()</div>
            <div class="dec-desc">
              Transform the Ok or Err value. The other variant passes through
              unchanged.
            </div>
            <code-block
              lang="ts"
              code={`// Transform the success value
const names = result.map(team => team.map(m => m.name));

// Transform the error
const friendly = result.map_err(e => \`Failed: \${e.message}\`);`}
            ></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">and_then()</div>
            <div class="dec-desc">Chain fallible operations — the function only runs on Ok.</div>
            <code-block
              lang="ts"
              code={`const user = await LoomResult.fromPromise(fetchUser())
  .then(r => r.and_then(u =>
    u.verified
      ? LoomResult.ok(u)
      : LoomResult.err(new Error("Not verified"))
  ));`}
            ></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">match()</div>
            <div class="dec-desc">
              Exhaustive pattern match — handles both branches, returns a value.
              This is the recommended way to consume a Result.
            </div>
            <code-block
              lang="ts"
              code={`const greeting = result.match({
  ok:  (user) => \`Hello, \${user.name}!\`,
  err: (e)    => \`Error: \${e.message}\`,
});`}
            ></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--accent)"></loom-icon>
            <h2>Composable Match</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              The match object isn't fixed — <strong>each layer adds
              optional branches</strong>. The base <span class="ic">{"{ ok, err }"}</span>{" "}
              is always required (guarantees exhaustiveness), and
              specializations extend it with opt-in states.
            </div>

            <code-block
              lang="ts"
              code={`// ── Layer 1: LoomResult ──────────────────
// Base contract: ok and err are always required
result.match({
  ok:  (data) => render(data),
  err: (e)    => showError(e),
});

// ── Layer 2: ApiState ────────────────────
// Extends with optional \`loading\` branch
this.team.match({
  loading: () => <Skeleton />,       // ← opt-in
  ok:  (team) => <TeamGrid members={team} />,
  err: (e)    => <ErrorCard message={e.message} />,
});

// Omit loading? Falls through to err during initial fetch.
// The branch is additive, never breaking.`}
            ></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-desc">
              Each implementation checks for its optional branches first,
              then falls through to the base <span class="ic">ok</span> / <span class="ic">err</span>{" "}
              contract. It's a priority chain:
            </div>

            <code-block
              lang="ts"
              code={`// Inside ApiState.match():
match(cases) {
  if (loading && !data && !error && cases.loading)
    return cases.loading();           // opt-in branch
  return ok
    ? cases.ok(data)                  // base contract
    : cases.err(error);               // base contract
}`}
            ></code-block>
          </div>

          <div class="note">
            This pattern means <strong>simple uses stay simple</strong> — you
            can always call <span class="ic">.match({"{ ok, err }"})</span> on any
            Result-like type. But when you need richer handling, the
            branches are right there, fully typed. <strong>Opt-in
            granularity, not mandatory complexity.</strong>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="compass" size={20} color="var(--rose)"></loom-icon>
            <h2>Framework Integration</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              LoomResult isn't just a utility — it's woven into the framework
              everywhere errors can occur.
            </div>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">@api — Tri-State Match</div>
            <div class="dec-desc">
              Every <span class="ic">ApiState&lt;T&gt;</span> extends
              the match object with an optional <span class="ic">loading</span> branch.
              One call handles the entire fetch lifecycle:
            </div>
            <code-block
              lang="ts"
              code={`@api<Team[]>({ fn: () => fetch("/api/team"), pipe: ["json"] })
accessor team!: ApiState<Team[]>;

update() {
  return this.team.match({
    loading: () => <div class="skeleton" />,
    ok:  (team) => <team-grid members={team} />,
    err: (e)    => <error-card message={e.message} />,
  });
}`}
            ></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">@form — Validate as Result</div>
            <div class="dec-desc">
              <span class="ic">validate()</span> returns{" "}
              <span class="ic">LoomResult&lt;T, errors&gt;</span> — no more
              boolean checks:
            </div>
            <code-block
              lang="ts"
              code={`@form<LoginForm>({
  email:    { validate: v => v.includes("@") || "Invalid email" },
  password: { validate: v => v.length >= 8 || "Min 8 chars" },
})
accessor login!: FormState<LoginForm>;

onSubmit() {
  this.login.validate().match({
    ok:  (data)   => submitToServer(data),
    err: (errors) => console.log("Fix:", errors),
  });
}`}
            ></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">DI — Safe Lookups</div>
            <div class="dec-desc">
              <span class="ic">app.maybe()</span> returns a Result instead of{" "}
              <span class="ic">undefined</span>:
            </div>
            <code-block
              lang="ts"
              code={`// Before: manual undefined check
const svc = app.maybe(MyService);
if (!svc) throw new Error("missing");

// After: Result with combinators
app.maybe(MyService).match({
  ok:  (svc) => svc.doWork(),
  err: (e)   => console.warn(e.message),
});`}
            ></code-block>
          </div>

          <div class="feature-entry">
            <div class="dec-sig">@guard — Result-Based Guards</div>
            <div class="dec-desc">
              Route guards can return{" "}
              <span class="ic">LoomResult&lt;void, string&gt;</span> where the
              error string is the redirect path:
            </div>
            <code-block
              lang="ts"
              code={`@guard("auth")
checkAuth(route: RouteInfo, @inject(TokenStore) t: TokenStore) {
  if (!t.jwt) return LoomResult.err("/login");
  return LoomResult.OK;  // allow navigation
}`}
            ></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="book" size={20} color="var(--accent)"></loom-icon>
            <h2>API Reference</h2>
          </div>
          <table class="api-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Returns</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>LoomResult.ok(data)</code></td>
                <td><code>LoomResult&lt;T, never&gt;</code></td>
                <td>Create an Ok result</td>
              </tr>
              <tr>
                <td><code>LoomResult.ok()</code></td>
                <td><code>LoomResult&lt;void, never&gt;</code></td>
                <td>Create a void Ok result</td>
              </tr>
              <tr>
                <td><code>LoomResult.err(error)</code></td>
                <td><code>LoomResult&lt;never, E&gt;</code></td>
                <td>Create an Err result</td>
              </tr>
              <tr>
                <td><code>LoomResult.OK</code></td>
                <td><code>LoomResult&lt;void, never&gt;</code></td>
                <td>Pre-allocated void Ok constant</td>
              </tr>
              <tr>
                <td><code>LoomResult.fromPromise(p)</code></td>
                <td><code>Promise&lt;LoomResult&lt;T, E&gt;&gt;</code></td>
                <td>Wrap a Promise into a Result</td>
              </tr>
              <tr>
                <td><code>.unwrap()</code></td>
                <td><code>T</code></td>
                <td>Return data or throw error</td>
              </tr>
              <tr>
                <td><code>.unwrap_or(fallback)</code></td>
                <td><code>T</code></td>
                <td>Return data or fallback value</td>
              </tr>
              <tr>
                <td><code>.map(fn)</code></td>
                <td><code>LoomResult&lt;U, E&gt;</code></td>
                <td>Transform Ok value, Err passes through</td>
              </tr>
              <tr>
                <td><code>.map_err(fn)</code></td>
                <td><code>LoomResult&lt;T, F&gt;</code></td>
                <td>Transform Err value, Ok passes through</td>
              </tr>
              <tr>
                <td><code>.and_then(fn)</code></td>
                <td><code>LoomResult&lt;U, E&gt;</code></td>
                <td>Chain fallible operations on Ok</td>
              </tr>
              <tr>
                <td><code>.match({"{ ok, err, ...ext? }"})</code></td>
                <td><code>R</code></td>
                <td>Composable pattern match — layers add optional branches</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    );
  }
}
