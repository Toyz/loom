<p align="center">
  <img src="../logo.svg" alt="Loom" width="60" />
</p>

<h1 align="center">@toyz/create-loom</h1>

<p align="center">
  Scaffold a new Loom + TypeScript + Vite project in seconds.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@toyz/create-loom"><img src="https://img.shields.io/npm/v/@toyz/create-loom?color=c084fc&label=npm" alt="npm" /></a>
  <a href="https://github.com/Toyz/loom"><img src="https://img.shields.io/badge/framework-@toyz/loom-86efac" alt="loom" /></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-fbbf24" alt="MIT" /></a>
</p>

---

## Usage

```bash
npm create @toyz/loom my-app
cd my-app
npm install
npm run dev
```

That's it. No prompts, no config wizard, no JavaScript option — Loom is TypeScript only.

## What you get

```
my-app/
├── index.html            5 lines
├── package.json          1 dep, 2 devDeps
├── tsconfig.json         Loom JSX pre-configured
├── vite.config.ts        esbuild JSX wired to Loom
└── src/
    ├── main.tsx           app.start()
    ├── app.tsx            starter component
    └── global.d.ts        CSS module types
```

### Dependencies

| Type              | Package      | Why                                  |
| ----------------- | ------------ | ------------------------------------ |
| `dependencies`    | `@toyz/loom` | The framework (zero transitive deps) |
| `devDependencies` | `typescript` | Type checking                        |
| `devDependencies` | `vite`       | Dev server + bundler                 |

No other packages. No plugins. No polyfills.

## Current directory

To scaffold into the current directory:

```bash
npm create @toyz/loom .
```

## Links

- **Framework** — [@toyz/loom](https://www.npmjs.com/package/@toyz/loom)
- **Docs** — [toyz.github.io/loom](https://toyz.github.io/loom/)
- **Source** — [github.com/Toyz/loom](https://github.com/Toyz/loom)

## License

[MIT](../LICENSE) — do whatever you want with it.
