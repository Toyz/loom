# @toyz/loom-placeholder

Placeholder components for [Loom](https://github.com/Toyz/loom). Pluggable providers, ships with [rgba.lol](https://rgba.lol).

```
npm install @toyz/loom-placeholder
```

**One dependency:** `@toyz/loom`. That's it.

---

## Quick Start

### 1. Register a Provider

```ts
import { app } from "@toyz/loom";
import { PlaceholderProvider, RgbaPlaceholder } from "@toyz/loom-placeholder";

app.use(PlaceholderProvider, new RgbaPlaceholder());
```

### 2. Use `<loom-placeholder>`

```tsx
import "@toyz/loom-placeholder"; // registers <loom-placeholder>

<loom-placeholder color="ff0000" width={300} height={200} />
<loom-placeholder color="00ff0080" width={64} height={64} format="svg" />
```

The `color` prop accepts hex without `#`:
- **6 chars** → RGB (e.g. `"ff00aa"`)
- **8 chars** → RGBA (e.g. `"ff00aa80"`)

### 3. Use the Provider Directly

```ts
const provider = new RgbaPlaceholder();

provider.rgba({ r: 255, g: 0, b: 170, width: 300, height: 200 });
// → "https://rgba.lol/ff/00/aa/300x200.png"

provider.rgba({ r: 255, g: 0, b: 170, a: 128, width: 64, height: 64, format: "svg" });
// → "https://rgba.lol/ff/00/aa/80/64x64.svg"
```

---

## API

### `<loom-placeholder>`

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `string` | `"cccccc"` | Hex color (6 or 8 chars, no `#`) |
| `width` | `number` | `100` | Width in pixels |
| `height` | `number` | `100` | Height in pixels |
| `format` | `"png" \| "svg"` | `"png"` | Image format |
| `alt` | `string` | `"placeholder"` | Alt text |

### `PlaceholderProvider`

Abstract class — extend and register via DI.

```ts
abstract class PlaceholderProvider {
  abstract url(options: PlaceholderOptions): string;
}
```

### `RgbaPlaceholder`

Concrete provider backed by [rgba.lol](https://rgba.lol).

```ts
class RgbaPlaceholder extends PlaceholderProvider {
  constructor(baseUrl?: string);
  url(options: PlaceholderOptions): string;
  rgba(options: RgbaOptions): string;
}
```

---

## Custom Providers

Swap to any placeholder service:

```ts
class PlaceholderDotComProvider extends PlaceholderProvider {
  url(options: PlaceholderOptions): string {
    return `https://via.placeholder.com/${options.width}x${options.height}`;
  }
}

app.use(PlaceholderProvider, new PlaceholderDotComProvider());
```

One DI swap. Every `<loom-placeholder>` uses the new provider. No component changes.

---

## Testing

```ts
import { MockPlaceholder } from "@toyz/loom-placeholder/testing";

const mock = new MockPlaceholder();
app.use(PlaceholderProvider, mock);

// ... mount components ...

mock.assertCalled(1);
mock.assertCalledWith({ width: 300, height: 200 });
mock.reset();
```

---

## License

MIT
