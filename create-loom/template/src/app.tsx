import { LoomElement, component, reactive, computed, css, styles } from "@toyz/loom";

/**
 * Styles are scoped to this component's shadow root, so these bare `button`
 * and `h1` selectors cannot reach anything else on the page.
 */
const appStyles = css`
  :host {
    display: grid;
    place-content: center;
    gap: 1rem;
    min-height: 100vh;
    padding: 2rem;
    text-align: center;
    font-family: system-ui, sans-serif;
    color: #1a1a1a;
    background: #fafafa;
  }

  @media (prefers-color-scheme: dark) {
    :host {
      color: #ededed;
      background: #111;
    }
  }

  h1 {
    margin: 0;
    font-size: 2.5rem;
    font-weight: 300;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    opacity: 0.6;
  }

  button {
    justify-self: center;
    padding: 0.6rem 1.4rem;
    border: 1px solid currentColor;
    border-radius: 6px;
    background: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }

  button:hover {
    background: color-mix(in srgb, currentColor 10%, transparent);
  }

  .count {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
`;

@component("my-app")
@styles(appStyles)
export class MyApp extends LoomElement {
  /** Writing to this re-renders. No setState, no dependency array. */
  @reactive accessor count = 0;

  /** Recomputed only when `count` changes. */
  @computed get parity() {
    return this.count % 2 === 0 ? "even" : "odd";
  }

  update() {
    return (
      <div>
        <h1>Loom</h1>
        <p>Edit src/app.tsx and save.</p>
        <button onClick={() => this.count++}>
          Clicked <span class="count">{this.count}</span> times
        </button>
        <p>That is {this.parity}.</p>
      </div>
    );
  }
}
