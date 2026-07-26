/**
 * Home — Landing Page
 *
 * Read top to bottom it should answer four questions in order:
 *   what is this        masthead
 *   show me             the card
 *   what am I looking at  the annotated punches, keyed to that same card
 *   why should I care   the spec sheet
 *   where do I start    the three doors
 *
 * The middle step is the one that makes it hang together: the card is not
 * decoration dropped beside the headline, it is the subject the next section
 * explains line by line. Every punched row is a decorator, which is what a
 * Jacquard card is — a column of punches telling the machine what to lift.
 *
 * Deliberately absent: a centred pill badge, a gradient-filled last word, a
 * pair of buttons, a six-up grid of colour-coded feature tiles, and a row of
 * big-number vanity stats.
 */
import {
  LoomElement, component, css, styles as applyStyles,
  reactive, debounce,
} from "@toyz/loom";
import { clipboard } from "@toyz/loom/element";
import { route } from "@toyz/loom/router";
import { DECORATOR_COUNT } from "../data/decorators";

const INSTALL_CMD = "npm install @toyz/loom";

/** The component printed on the card. Real, and it compiles. */
const HERO_SOURCE = `@component("unread-badge")
export class UnreadBadge extends LoomElement {
  @prop accessor channel = "";
  @reactive accessor count = 0;

  @on(MessageReceived)
  bump(e: MessageReceived) {
    if (e.channel === this.channel) this.count++;
  }

  @interval(30_000)
  resync() { this.count = unreadFor(this.channel); }

  update() {
    return <b hidden={() => this.count === 0}>{() => this.count}</b>;
  }
}`;

/** Keyed to the punched lines on the card above, in the order they appear. */
const PUNCHES = [
  {
    mark: "@component",
    text: "Registers the custom element. No manual customElements.define, no registry file to keep in sync.",
  },
  {
    mark: "@prop",
    text: "Exposes an observed attribute. Writing channel=\"#general\" in HTML sets the field, coerced to the declared type.",
  },
  {
    mark: "@reactive",
    text: "Marks state the template depends on. Assigning to it schedules exactly one render for the tick.",
  },
  {
    mark: "@on",
    text: "Subscribes to a typed event on the bus for as long as the element is connected, and unsubscribes when it is not.",
  },
  {
    mark: "@interval",
    text: "Starts a timer on connect and clears it on disconnect. There is no clearInterval to forget.",
  },
];

const DOORS = [
  { to: "/guides/getting-started", label: "Getting started", note: "Install, wire the app, render the first component." },
  { to: "/guides/your-first-app", label: "Your first app", note: "Build something real end to end, with routing and state." },
  { to: "/element/overview", label: "Reference", note: "Every decorator, what it hooks, and where it bites." },
];

const linkStyle = css`a {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  letter-spacing: 0.02em;
  text-decoration: none;
  color: var(--text-primary);
  border-bottom: 1px solid var(--thread);
  padding-bottom: 2px;
}
a:hover { color: var(--thread); text-decoration: none; }`;

const styles = css`
  :host { display: block; }

  /* Every band shares one rhythm so the page reads as a sequence rather than
     as four unrelated widgets stacked up. */
  section { margin-bottom: var(--space-16); }
  section:last-child { margin-bottom: var(--space-12); }

  .band-label {
    font-family: var(--font-mono);
    font-size: 0.625rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--text-muted);
    padding-bottom: var(--space-3);
    margin-bottom: var(--space-6);
    border-bottom: 1px solid var(--warp);
  }

  /* ── 1. Masthead ── */

  .masthead { padding-top: var(--space-10); }

  .eyebrow {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: var(--space-5);
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 5.4vw, 4.25rem);
    font-weight: 700;
    line-height: 0.98;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: var(--text-primary);
    margin: 0 0 var(--space-6);
  }
  h1 .line { display: block; white-space: nowrap; }
  /* The verb the framework performs carries the thread colour. */
  h1 .lift { color: var(--thread); }

  .lede {
    font-size: 1.125rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0 0 var(--space-7, 1.75rem);
    max-width: 58ch;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    flex-wrap: wrap;
    row-gap: var(--space-3);
  }

  .install {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    white-space: nowrap;
    color: var(--text-secondary);
    border: 1px solid var(--warp);
    padding: 7px 10px 7px 12px;
    background: var(--ground-sunk);
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease;
  }
  .install:hover { border-color: var(--warp-lit); color: var(--text-primary); }
  .install .sigil { color: var(--text-muted); }
  .install .state {
    min-width: 46px;
    text-align: center;
    font-size: 0.625rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-muted);
    border-left: 1px solid var(--warp);
    padding-left: 10px;
  }
  .install .state.done { color: var(--ok); }

  /* ── 3. The punches, keyed to the card ── */

  .punch-list { display: block; }
  .punch {
    display: grid;
    grid-template-columns: 12rem 1fr;
    align-items: baseline;
    gap: var(--space-6);
    padding: var(--space-4) 0;
    border-bottom: 1px solid var(--warp);
  }
  .punch:last-child { border-bottom: none; }
  .punch .mark {
    display: flex;
    align-items: baseline;
    gap: 10px;
    font-family: var(--font-mono);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--thread);
  }
  /* A filled position, matching the punched rows on the card above. */
  .punch .mark::before {
    content: '';
    width: 7px;
    height: 10px;
    flex-shrink: 0;
    background: var(--thread);
    transform: translateY(1px);
  }
  .punch p {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.65;
    color: var(--text-secondary);
    max-width: 60ch;
  }

  /* ── 4. Spec sheet ── */

  .claim {
    display: grid;
    grid-template-columns: 13rem 1fr;
  }
  .claim + .claim { margin-top: var(--space-2); }
  .claim dt {
    font-family: var(--font-display);
    font-size: 0.9375rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--text-primary);
    text-align: right;
    padding: var(--space-4) var(--space-6) var(--space-4) 0;
    line-height: 1.3;
  }
  .claim dd {
    margin: 0;
    font-size: 0.9375rem;
    line-height: 1.65;
    color: var(--text-secondary);
    max-width: 60ch;
    border-left: 1px solid var(--warp);
    padding: var(--space-4) 0 var(--space-4) var(--space-6);
  }

  /* ── 5. Doors ── */

  .doors { display: block; }

  /* Layout goes on the anchor inside loom-link's shadow, not on the host.
     Styling the host leaves the padding outside the hit area and the slotted
     children never pick up the grid. */
  loom-link.door::part(anchor) {
    display: grid;
    grid-template-columns: 14rem 1fr;
    gap: var(--space-6);
    align-items: baseline;
    width: 100%;
    padding: var(--space-5) var(--space-4);
    border-bottom: 1px solid var(--warp);
    text-decoration: none;
    transition: background 0.15s ease;
  }
  loom-link.door:first-child::part(anchor) {
    border-top: 1px solid var(--warp);
  }
  loom-link.door::part(anchor):hover {
    background: var(--ground-raised);
  }

  .door-label {
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.01em;
    color: var(--text-primary);
  }
  loom-link.door::part(anchor):hover .door-label { color: var(--thread); }

  /* Deliberately NOT .note — docStyles renders that class as a callout and
     stamps a "NOTE" label in front of it. */
  .door-note {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--text-secondary);
  }
  .door-arrow {
    font-family: var(--font-mono);
    color: var(--thread);
  }

  @media (max-width: 860px) {
    .punch, .claim, .door { grid-template-columns: 1fr; gap: var(--space-2); }
    .claim dt {
      text-align: left;
      padding: var(--space-4) 0 var(--space-1);
    }
    .claim dd {
      border-left: none;
      padding: 0 0 var(--space-4);
    }
    .door { padding-bottom: var(--space-3); }
  }
`;

@route("/")
@component("page-home")
@applyStyles(styles)
export default class PageHome extends LoomElement {
  @reactive accessor copied = false;

  /**
   * @clipboard("write") copies whatever the method returns, so the command
   * lives in one place. Dogfooding: the docs use the decorator they document.
   */
  @clipboard("write")
  private copyCommand() {
    return INSTALL_CMD;
  }

  private copyInstall() {
    this.copyCommand();
    this.copied = true;
    this.resetCopied();
  }

  /**
   * @debounce, not @timeout. @timeout fires once ms after CONNECT, so calling
   * it directly cleared the flag in the same tick and the button looked dead.
   * @debounce defers the call and is cancelled on disconnect.
   */
  @debounce(1600)
  private resetCopied() {
    this.copied = false;
  }

  update() {
    return (
      <div>
        <section class="masthead">
          <div class="eyebrow">{`Loom v${__LOOM_VERSION__}`}</div>
          <h1>
            <span class="line">Declare it.</span>
            <span class="line">Loom <span class="lift">lifts</span> it.</span>
          </h1>
          <p class="lede">
            Web components where state, timing, events and DOM access are declared on
            the line above the code that uses them — and released for you when the
            element leaves the page.
          </p>
          <div class="actions">
            <loom-link to="/guides/getting-started" styles={[linkStyle]}>
              Start here →
            </loom-link>
            <button
              class="install"
              onClick={() => this.copyInstall()}
              title="Copy the install command"
            >
              <span class="sigil">$</span>
              <span>{INSTALL_CMD}</span>
              <span class={`state ${this.copied ? "done" : ""}`}>
                {() => (this.copied ? "Copied" : "Copy")}
              </span>
            </button>
          </div>
        </section>

        <section>
          <div class="band-label">A component, punched</div>
          <code-block
            lang="tsx"
            card
            foot={`0 DEPENDENCIES,~8KB GZIPPED,${DECORATOR_COUNT} DECORATORS,TYPESCRIPT`}
            code={HERO_SOURCE}
          ></code-block>
        </section>

        <section>
          <div class="band-label">Five punches, five jobs</div>
          <div class="punch-list">
            {PUNCHES.map((p) => (
              <div class="punch">
                <span class="mark">{p.mark}</span>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div class="band-label">What that buys you</div>
          <dl>
            <div class="claim">
              <dt>No virtual DOM</dt>
              <dd>
                JSX builds real DOM nodes. Updates run a keyed morph that touches only
                what changed, so focus, scroll position and text selection survive a
                re-render.
              </dd>
            </div>
            <div class="claim">
              <dt>Fine-grained updates</dt>
              <dd>
                A closure in your template binds to exactly the reactives it reads.
                Changing one patches that node instead of re-rendering the component.
              </dd>
            </div>
            <div class="claim">
              <dt>Attributes are components</dt>
              <dd>
                <code>@attribute</code> attaches behaviour to any element, including
                ones Loom did not render. A tooltip or a hotkey becomes a directive
                rather than a wrapper.
              </dd>
            </div>
            <div class="claim">
              <dt>Batteries, no tax</dt>
              <dd>
                Router with guards, DI container, reactive stores with pluggable
                persistence, and a data-fetching layer — each importable on its own.
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <div class="band-label">Start somewhere</div>
          <div class="doors">
            {DOORS.map((d) => (
              <loom-link to={d.to} class="door">
                <span class="door-label">{d.label}</span>
                <span class="door-note">
                  {d.note} <span class="door-arrow">→</span>
                </span>
              </loom-link>
            ))}
          </div>
        </section>
      </div>
    );
  }
}
