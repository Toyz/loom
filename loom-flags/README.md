# @toyz/loom-flags

Decorator-driven feature flags for [Loom](https://github.com/Toyz/loom). Reactive, transport-swappable, real-time.

```
npm install @toyz/loom-flags
```

**One dependency:** `@toyz/loom`. That's it.

---

## Quick Start

### 1. Create a Provider

```ts
import { app } from "@toyz/loom";
import { FlagProvider } from "@toyz/loom-flags";

class MyFlagProvider extends FlagProvider {
  isEnabled(flag: string, context?: Record<string, any>): boolean {
    return this.flags.get(flag) ?? false;
  }

  getVariant<T = string>(flag: string, fallback: T): T {
    const val = this.variants.get(flag);
    return (val !== undefined ? val : fallback) as T;
  }
}

const provider = new MyFlagProvider();
provider.set("dark-mode", true);
provider.set("beta-export", false);

app.use(FlagProvider, provider);
```

### 2. Use `@flag` on a Class

```ts
import { flag } from "@toyz/loom-flags";

@component("new-dashboard")
@flag("new-dashboard")
class NewDashboard extends LoomElement {
  update() {
    if (!this.flagEnabled) return <div>Feature not available</div>;
    return <div>Welcome to the new dashboard!</div>;
  }
}
```

The `@flag` class decorator injects a reactive `flagEnabled` property. When the flag changes at runtime, `scheduleUpdate()` is called automatically.

### 3. Use `@flag` on a Method

```ts
@component("data-tools")
class DataTools extends LoomElement {
  @flag("beta-export")
  handleExport() {
    // Only runs when "beta-export" is enabled — no-op otherwise
    downloadCSV(this.data);
  }
}
```

### 4. Dynamic Context

Pass user info to the provider for targeted flag evaluation:

```ts
@flag("premium-widgets", el => ({
  userId: el.user.id,
  plan: el.user.plan,
}))
class PremiumWidget extends LoomElement { ... }
```

### 5. Declarative with `<loom-flag>`

```tsx
import "@toyz/loom-flags"; // registers <loom-flag>

<loom-flag name="beta-feature">
  <new-widget slot="enabled" />
  <span slot="disabled">Coming soon…</span>
</loom-flag>
```

Swaps slots reactively when the flag changes — no component code required.

---

## Real-Time Updates

Providers can push flag changes at runtime. Every `@flag` and `<loom-flag>` re-evaluates instantly:

```ts
// From a WebSocket handler, SSE listener, or polling loop:
provider.set("dark-mode", false);        // toggles all @flag("dark-mode")
provider.setVariant("checkout", "b");    // updates variant value
```

Under the hood, `set()` fires a `FlagChanged` event on the Loom bus. All subscribers react.

---

## API

### `@flag(name, context?)`

Multi-kind decorator. Works on classes and methods.

| Target | Behavior |
|---|---|
| Class | Injects reactive `flagEnabled` + `flagName` properties |
| Method | Guards execution — no-op when flag is off |

### `FlagProvider`

Abstract class — extend and register via DI.

```ts
abstract class FlagProvider {
  abstract isEnabled(flag: string, context?: Record<string, any>): boolean;
  abstract getVariant<T = string>(flag: string, fallback: T): T;
  set(flag: string, enabled: boolean): void;
  setVariant(flag: string, value: string): void;
}
```

### `<loom-flag name="...">`

Built-in component for declarative flag gating.

| Slot | Shown when |
|---|---|
| `enabled` | Flag is on |
| `disabled` | Flag is off |

### `FlagChanged`

Bus event dispatched when a flag changes.

```ts
class FlagChanged extends LoomEvent {
  readonly flag: string;
  readonly enabled: boolean;
  readonly variant?: string;
}
```

---

## Custom Providers

Integrate with any flag service:

```ts
// LaunchDarkly
class LDProvider extends FlagProvider {
  constructor(private client: LDClient) { super(); }

  isEnabled(flag: string, context?: Record<string, any>): boolean {
    return this.client.variation(flag, context, false);
  }

  getVariant<T = string>(flag: string, fallback: T): T {
    return this.client.variation(flag, {}, fallback);
  }
}

app.use(FlagProvider, new LDProvider(ldClient));
```

One DI swap. Every `@flag` and `<loom-flag>` in the app uses the new provider. No component changes.

---

## Testing

```ts
import { MockFlags } from "@toyz/loom-flags/testing";

const flags = new MockFlags();
app.use(FlagProvider, flags);

// Toggle flags
flags.enable("dark-mode");
flags.disable("beta-export");
flags.setVariant("checkout-flow", "variant-b");

// Assertions
flags.assertChecked("dark-mode");
flags.assertEnabled("dark-mode");
flags.assertDisabled("beta-export");
flags.assertNotChecked("unknown-flag");

// Reset between tests
flags.reset();
```

---

## License

MIT
