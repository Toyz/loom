import { LoomElement, component, reactive, css, styles } from "@toyz/loom";

const appStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif;
    background: #0a0a0a;
    color: #ededed;
  }
  h1 {
    font-size: 3rem;
    font-weight: 200;
    margin: 0 0 1rem;
    background: linear-gradient(135deg, #c084fc, #67e8f9);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  p {
    color: #888;
    margin: 0 0 2rem;
  }
  button {
    padding: 0.75rem 1.5rem;
    border: 1px solid #333;
    border-radius: 8px;
    background: #1a1a1a;
    color: #ededed;
    font-size: 1rem;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  button:hover {
    border-color: #c084fc;
    background: #222;
  }
  span {
    font-weight: bold;
    color: #c084fc;
  }
`;

@component("my-app")
@styles(appStyles)
export class MyApp extends LoomElement {
  @reactive accessor count = 0;

  update() {
    return (
      <div>
        <h1>Loom</h1>
        <p>Weave the web Loom</p>
        <button onClick={() => this.count++}>
          Count: <span>{this.count}</span>
        </button>
      </div>
    );
  }
}
