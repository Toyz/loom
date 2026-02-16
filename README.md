<p align="center">
  <img src="./logo.svg" alt="Loom" width="80" />
</p>

<h1 align="center">Loom</h1>

<p align="center">
  Decorator-driven web components that started as a meme and accidentally became useful.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@toyz/loom"><img src="https://img.shields.io/npm/v/@toyz/loom?color=c084fc&label=npm" alt="npm" /></a>
  <a href="https://toyz.github.io/loom/"><img src="https://img.shields.io/badge/docs-live-86efac" alt="docs" /></a>
  <a href="https://placing.space"><img src="https://img.shields.io/badge/used%20on-placing.space-67e8f9" alt="placing.space" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-fbbf24" alt="MIT" /></a>
</p>

---

## What is this?

Loom was born out of pure spite for boilerplate. What began as an ironic "what if decorators did _everything_?" experiment turned into a genuinely useful framework for building web components.

It powers [placing.space](https://placing.space) in production — a real-time collaborative pixel canvas — so it's been battle-tested with WebSocket streams, thousands of DOM nodes, and zero framework overhead.

## Features

- **`@component`** — register custom elements in one line
- **`@reactive` / `@prop`** — fine-grained reactivity that only re-renders what changed
- **`@computed` / `@watch`** — derived state and side effects
- **`@on` / `@emit`** — declarative event handling
- **JSX + DOM morphing** — write JSX, get surgical DOM patches (no virtual DOM)
- **`@inject` / `@service`** — dependency injection container
- **Hash & history router** — `@route`, `@guard`, `<loom-outlet>`
- **`css\`\``** — adopted stylesheets with zero FOUC
- **`<loom-virtual>`** — virtualized list for huge datasets
- **Zero dependencies** — just TypeScript and the platform

## Install

```bash
npm install @toyz/loom
```

## Quick Start

```ts
import { LoomElement, component, reactive, css } from "@toyz/loom";

const styles = css`
  button { padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }
  span   { font-weight: bold; margin-left: 0.5rem; }
`;

@component("click-counter")
class ClickCounter extends LoomElement {
  @reactive count = 0;

  update() {
    this.shadow.adoptedStyleSheets = [styles];
    return (
      <button onClick={() => this.count++}>
        Clicks: <span>{this.count}</span>
      </button>
    );
  }
}
```

```html
<click-counter></click-counter>
<script type="module" src="./main.ts"></script>
```

## TSConfig

Loom ships its own JSX runtime. Point your config at it:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@toyz/loom"
  }
}
```

For Vite:

```ts
// vite.config.ts
export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "@toyz/loom",
  },
});
```

## Docs

Full documentation with interactive examples:

**[toyz.github.io/loom](https://toyz.github.io/loom/)**

## License

[MIT](./LICENSE) — do whatever you want with it.
