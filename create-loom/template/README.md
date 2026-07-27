# loom-app

Built with [Loom](https://toyz.github.io/loom/).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the built output |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests on change |
| `npm run typecheck` | Types only, no build |

## Layout

```
index.html         mounts <my-app>
src/main.tsx       app.start()
src/app.tsx        the component
src/app.test.tsx   its test
vitest.setup.ts    calls app.start() before tests
```

## The four settings that matter

Loom needs standard (stage-3) decorators and the `accessor` keyword. Both are
already configured here, in two places:

- `tsconfig.json` -- `target: es2022` and `jsxImportSource: @toyz/loom`.
  `experimentalDecorators` must stay off; it selects the old, incompatible
  decorator proposal.
- `vite.config.ts` -- the same two for esbuild, plus `keepNames: true`.
  Minifiers rename classes, and Loom uses class identity as a DI key, so
  without it production builds fail in ways development never shows.

## Adding a component

Any class with `@component` is registered when `app.start()` runs, so a new
file only needs importing once:

```tsx
// src/counter.tsx
import { LoomElement, component, reactive } from "@toyz/loom";

@component("my-counter")
export class MyCounter extends LoomElement {
  @reactive accessor n = 0;
  update() {
    return <button onClick={() => this.n++}>{this.n}</button>;
  }
}
```

```ts
// src/main.tsx
import "./counter";
```

Docs: <https://toyz.github.io/loom/>
