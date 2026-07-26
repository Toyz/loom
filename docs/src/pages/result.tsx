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
        <doc-header title="LoomResult&lt;T, E&gt;" subtitle="A Rust-inspired Result type for explicit, composable error handling.
          Used throughout the framework and available as a public utility."></doc-header>

        <section>
          <p>An exception is an invisible second return type. Nothing in a function's signature says it throws, nothing forces a caller to handle it, and the compiler is equally happy whether you did or not — so the error path is the one that is never exercised until production.</p>
          <p><span class="ic">LoomResult</span> makes it the first return type instead. A function returns success or failure as a value, and reading the success requires acknowledging the failure. It is used throughout Loom where an operation can fail for an ordinary reason: guards, validation, and transforms.</p>
        </section>

        <doc-section heading="Why Result?">
            <p>
              JavaScript's <span class="ic">try/catch</span> is invisible in the
              type system — a function that throws looks identical to one that
              doesn't. <span class="ic">LoomResult</span> makes errors <strong>visible, typed, and composable</strong>.
            </p>
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
        </doc-section>
        <doc-section heading="Creating Results">
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
        </doc-section>
        <doc-section heading="Narrowing">
            <p>
              The <span class="ic">.ok</span> boolean is a discriminant —
              TypeScript narrows <span class="ic">.data</span> and <span class="ic">.error</span> automatically:
            </p>
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
        </doc-section>
        <doc-section heading="Combinators">

          <api-entry sig="unwrap() / unwrap_or()">
            <p>
              Extract the value — <span class="ic">unwrap()</span> throws on Err, <span class="ic">unwrap_or()</span> returns a fallback.
            </p>
            <code-block
              lang="ts"
              code={`result.unwrap();        // T — throws the error if Err
result.unwrap_or([]);   // T — returns [] if Err`}
            ></code-block>
          </api-entry>
          <api-entry sig="map() / map_err()">
            <p>
              Transform the Ok or Err value. The other variant passes through
              unchanged.
            </p>
            <code-block
              lang="ts"
              code={`// Transform the success value
const names = result.map(team => team.map(m => m.name));

// Transform the error
const friendly = result.map_err(e => \`Failed: \${e.message}\`);`}
            ></code-block>
          </api-entry>
          <api-entry sig="and_then()">
            <p>Chain fallible operations — the function only runs on Ok.</p>
            <code-block
              lang="ts"
              code={`const user = await LoomResult.fromPromise(fetchUser())
  .then(r => r.and_then(u =>
    u.verified
      ? LoomResult.ok(u)
      : LoomResult.err(new Error("Not verified"))
  ));`}
            ></code-block>
          </api-entry>
          <api-entry sig="match()">
            <p>
              Exhaustive pattern match — handles both branches, returns a value.
              This is the recommended way to consume a Result.
            </p>
            <code-block
              lang="ts"
              code={`const greeting = result.match({
  ok:  (user) => \`Hello, \${user.name}!\`,
  err: (e)    => \`Error: \${e.message}\`,
});`}
            ></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="Composable Match">
            <p>
              The match object isn't fixed — <strong>each layer adds
              optional branches</strong>. The base <span class="ic">{"{ ok, err }"}</span> is always required (guarantees exhaustiveness), and
              specializations extend it with opt-in states.
            </p>

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

            <p>
              Each implementation checks for its optional branches first,
              then falls through to the base <span class="ic">ok</span> / <span class="ic">err</span> contract. It's a priority chain:
            </p>

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

          <doc-notification type="note">
            This pattern means <strong>simple uses stay simple</strong> — you
            can always call <span class="ic">.match({"{ ok, err }"})</span> on any
            Result-like type. But when you need richer handling, the
            branches are right there, fully typed. <strong>Opt-in
            granularity, not mandatory complexity.</strong>
          </doc-notification>
        </doc-section>
        <doc-section heading="Framework Integration">
            <p>
              LoomResult isn't just a utility — it's woven into the framework
              everywhere errors can occur.
            </p>

          <api-entry sig="@api — Tri-State Match">
            <p>
              Every <span class="ic">ApiState&lt;T&gt;</span> extends
              the match object with an optional <span class="ic">loading</span> branch.
              One call handles the entire fetch lifecycle:
            </p>
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
          </api-entry>
          <api-entry sig="@form — Validate as Result">
            <p>
              <span class="ic">validate()</span> returns <span class="ic">LoomResult&lt;T, errors&gt;</span> — no more
              boolean checks:
            </p>
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
          </api-entry>
          <api-entry sig="DI — Safe Lookups">
            <p>
              <span class="ic">app.maybe()</span> returns a Result instead of <span class="ic">undefined</span>:
            </p>
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
          </api-entry>
          <api-entry sig="@guard — Result-Based Guards">
            <p>
              Route guards can return <span class="ic">LoomResult&lt;void, string&gt;</span> where the
              error string is the redirect path:
            </p>
            <code-block
              lang="ts"
              code={`@guard("auth")
checkAuth(route: RouteInfo, @inject(TokenStore) t: TokenStore) {
  if (!t.jwt) return LoomResult.err("/login");
  return LoomResult.OK;  // allow navigation
}`}
            ></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="API Reference">
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
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
