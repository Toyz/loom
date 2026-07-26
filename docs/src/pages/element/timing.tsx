/**
 * Timing — /element/timing
 *
 * @interval, @timeout, @debounce, @throttle, @animationFrame
 *
 * Pilot page for the rewritten docs. Every behavioural claim here was read out
 * of src/element/timing.ts and src/render-loop.ts, not inferred from the
 * decorator names — including the ones the previous copy got wrong.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementTiming extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Timing"
          subtitle="Five decorators for work that happens later. Every one of them releases itself when the component leaves the DOM."
        ></doc-header>

        <section>
          <p>
            A timer outliving its component is the classic web component leak: the element
            is gone, the callback still fires, and it writes to a detached DOM or a store
            nobody is reading. These decorators exist so you never write the matching <span class="ic">clear</span> call — teardown is registered at the same moment
            the timer starts.
          </p>
          <p>
            They differ along three axes that matter more than their names: whether the
            decorator fires on its own or only when you call the method, whether it
            replaces your method with a wrapper, and whether it keeps running while the
            browser tab is hidden.
          </p>

          <punch-matrix
            columns="SELF-FIRES,WRAPS,RUNS HIDDEN,FRAME-SYNCED"
            rows={[
              { name: "@interval", punches: "SELF-FIRES,RUNS HIDDEN", note: "Repeats until disconnect" },
              { name: "@timeout", punches: "SELF-FIRES,RUNS HIDDEN", note: "Fires once per connect" },
              { name: "@debounce", punches: "WRAPS,RUNS HIDDEN", note: "Waits for quiet, then runs once" },
              { name: "@throttle", punches: "WRAPS,RUNS HIDDEN", note: "Leading edge, plus a trailing call" },
              { name: "@animationFrame", punches: "SELF-FIRES,FRAME-SYNCED", note: "Shares one rAF loop with every other component" },
            ]}
          ></punch-matrix>

          <p class="note">
            Only <span class="ic">@animationFrame</span> stops when the tab is hidden,
            because that is what <span class="ic">requestAnimationFrame</span> does.
            Anything visual belongs there. A hidden-tab <span class="ic">@interval</span> is
            still burning battery.
          </p>
        </section>

        <section>
          <div class="group-header">
            <h2>@interval</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@interval(ms: number)</div>
            <div class="dec-desc">
              Starts a <span class="ic">setInterval</span> when the element connects and
              clears it when the element disconnects.
            </div>
            <code-block lang="ts" code={`@component("session-timer")
class SessionTimer extends LoomElement {
  @reactive accessor secondsLeft = 900;

  @interval(1000)
  countDown() {
    if (this.secondsLeft > 0) this.secondsLeft--;
    else this.emit(new SessionExpired());
  }
}`}></code-block>
            <p class="warning">
              The timer starts on <strong>connect</strong>, not on construction, and connect
              runs again every time the element moves in the DOM. Appending an existing
              element somewhere else restarts the interval rather than continuing it. If
              elapsed time has to survive a move, store a start timestamp instead of
              counting ticks.
            </p>
          </div>
        </section>

        <section>
          <div class="group-header">
            <h2>@timeout</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@timeout(ms: number)</div>
            <div class="dec-desc">
              Runs the method once, <span class="ic">ms</span> after connect. Cancelled if
              the element disconnects first.
            </div>
            <code-block lang="ts" code={`@component("toast-message")
class ToastMessage extends LoomElement {
  @reactive accessor visible = true;

  @timeout(4000)
  dismiss() {
    this.visible = false;
  }
}`}></code-block>
            <p class="warning">
              "Once" means once per connect, not once per element. A component that is
              moved twice runs its <span class="ic">@timeout</span> three times. For
              genuinely one-shot work, guard with a flag.
            </p>
          </div>
        </section>

        <section>
          <div class="group-header">
            <h2>@debounce</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@debounce(ms: number)</div>
            <div class="dec-desc">
              Replaces the method with a version that waits for <span class="ic">ms</span> of silence before running. Each call cancels the pending one, so a burst
              produces exactly one execution — with the arguments of the <em>last</em> call.
            </div>
            <code-block lang="ts" code={`@component("user-search")
class UserSearch extends LoomElement {
  @reactive accessor results: User[] = [];

  // Typing "ada" quickly issues one request, for "ada".
  @debounce(300)
  async search(term: string) {
    this.results = await findUsers(term);
  }
}`}></code-block>
            <p class="note">
              Debounce delays <em>everything</em>, including the first call. If the UI
              should react at once and then settle, you want <span class="ic">@throttle</span>.
            </p>
          </div>
        </section>

        <section>
          <div class="group-header">
            <h2>@throttle</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">@throttle(ms: number)</div>
            <div class="dec-desc">
              Replaces the method with a version that runs immediately, then at most once
              per <span class="ic">ms</span> afterwards.
            </div>
            <code-block lang="ts" code={`@component("scroll-progress")
class ScrollProgress extends LoomElement {
  @reactive accessor percent = 0;

  @throttle(100)
  onScroll() {
    const el = document.documentElement;
    this.percent = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
  }
}`}></code-block>
            <p class="note">
              Loom's throttle is <strong>leading and trailing</strong>: the first call runs
              at once, and the last call inside the window runs when the window closes.
              Calls in between are dropped. For a scroll handler that means you always get
              the final resting position — many throttle implementations drop the trailing
              call and leave the UI one event stale.
            </p>
          </div>
        </section>

        <section>
          <div class="group-header">
            <h2>@animationFrame</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-sig">
              @animationFrame | @animationFrame(layer) | @animationFrame(options)
            </div>
            <div class="dec-desc">
              Joins the shared render loop. The method receives <span class="ic">(dt, timestamp)</span> — <span class="ic">dt</span> is
              seconds since the previous frame, <span class="ic">timestamp</span> is the raw <span class="ic">requestAnimationFrame</span> value in milliseconds.
            </div>
            <code-block lang="ts" code={`@component("particle-field")
class ParticleField extends LoomElement {
  private particles: Particle[] = [];

  // Physics before paint: lower layers run first.
  @animationFrame({ layer: 0 })
  step(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  @animationFrame({ layer: 10, fps: 30 })
  paint() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (const p of this.particles) this.ctx.fillRect(p.x, p.y, 2, 2);
  }
}`}></code-block>

            <h3>One loop, not one per component</h3>
            <p>
              Every <span class="ic">@animationFrame</span> in the application shares a
              single <span class="ic">requestAnimationFrame</span> callback. A hundred
              animated components cost one rAF, not a hundred. <span class="ic">layer</span> orders callbacks within a frame — lower runs
              first — which is how you guarantee physics has finished before anything
              paints.
            </p>

            <h3>fps is a cap, and only below 60</h3>
            <p>
              <span class="ic">fps</span> applies only when it is above 0 and <strong>below 60</strong>. Passing <span class="ic">{`{ fps: 60 }`}</span> or
              higher is silently ignored and the callback runs every frame. The limiter
              subtracts its budget from an accumulator rather than resetting it, so a 30fps
              callback holds cadence instead of drifting slow.
            </p>

            <p class="caution">
              <span class="ic">dt</span> is <strong>0 on the first frame</strong> — there is
              no previous timestamp to subtract. Anything shaped like <span class="ic">distance / dt</span> divides by zero on frame one.
              Multiplying by <span class="ic">dt</span> is safe: the object simply does not
              move for one frame.
            </p>
          </div>
        </section>

        <section>
          <div class="group-header">
            <h2>Choosing between them</h2>
          </div>
          <table class="api-table">
            <thead>
              <tr>
                <th>You want</th>
                <th>Use</th>
                <th>Because</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>A clock, a poll, a heartbeat</td>
                <td><code>@interval</code></td>
                <td>Fixed wall-clock cadence, keeps running hidden</td>
              </tr>
              <tr>
                <td>Auto-dismiss, delayed reveal</td>
                <td><code>@timeout</code></td>
                <td>One shot per connect</td>
              </tr>
              <tr>
                <td>Search-as-you-type, autosave</td>
                <td><code>@debounce</code></td>
                <td>Collapses a burst into the last call</td>
              </tr>
              <tr>
                <td>Scroll, resize, pointer move</td>
                <td><code>@throttle</code></td>
                <td>Responds now and still settles correctly</td>
              </tr>
              <tr>
                <td>Canvas, physics, anything visual</td>
                <td><code>@animationFrame</code></td>
                <td>Frame-synced, pauses in a hidden tab</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <h2>Worked example</h2>
          </div>
          <p>
            A search field that stays responsive while typing and issues one request when
            you stop. It uses both wrappers for different jobs: throttle drives the instant
            local filter, debounce drives the network call.
          </p>
          <div class="specimen">
            <span class="label">Complete component</span>
            <p>
              Nothing elided. Drop this into a project with <span class="ic">@toyz/loom</span> installed and it runs.
            </p>
          </div>
          <code-block lang="tsx" code={`import { LoomElement, component, reactive, debounce, throttle } from "@toyz/loom";

interface Person { id: string; name: string }

@component("people-search")
export class PeopleSearch extends LoomElement {
  @reactive accessor term = "";
  @reactive accessor local: Person[] = [];
  @reactive accessor pending = false;

  private cache: Person[] = [];

  // Instant feedback per keystroke, capped at ten filter passes a second.
  @throttle(100)
  private filterLocal(term: string) {
    const q = term.toLowerCase();
    this.local = this.cache.filter((p) => p.name.toLowerCase().includes(q));
  }

  // One request, once typing stops.
  @debounce(300)
  private async fetchRemote(term: string) {
    if (!term) { this.pending = false; return; }
    this.pending = true;
    const res = await fetch(\`/api/people?q=\${encodeURIComponent(term)}\`);
    this.cache = await res.json();
    this.filterLocal(term);
    this.pending = false;
  }

  private onInput(e: Event) {
    this.term = (e.target as HTMLInputElement).value;
    this.filterLocal(this.term);
    this.fetchRemote(this.term);
  }

  update() {
    return (
      <div>
        <input value={this.term} onInput={(e) => this.onInput(e)} placeholder="Search people" />
        {() => this.pending ? <span>Searching…</span> : null}
        <ul>
          {this.local.map((p) => <li loom-key={p.id}>{p.name}</li>)}
        </ul>
      </div>
    );
  }
}`}></code-block>
        </section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}
