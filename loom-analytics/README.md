# @toyz/loom-analytics

Zero-dependency, transport-swappable analytics for [Loom](https://github.com/Toyz/loom). Decorator-driven event tracking.

```
npm install @toyz/loom-analytics
```

**One dependency:** `@toyz/loom`. That's it.

---

## Quick Start

### 1. Register a Transport

```ts
import { app } from "@toyz/loom";
import { AnalyticsTransport } from "@toyz/loom-analytics";

class PostHogTransport extends AnalyticsTransport {
  track(event: string, meta?: Record<string, any>): void {
    posthog.capture(event, meta);
  }
}

app.use(AnalyticsTransport, new PostHogTransport());
```

### 2. Track Events

One decorator, three targets:

```ts
import { track } from "@toyz/loom-analytics";

// Track page views — fires on mount
@track("page.dashboard", { section: "main" })
class Dashboard extends LoomElement {
  // Track actions — fires after method call
  @track("button.save")
  handleSave() {
    // ...
  }

  // Track state changes — fires on set
  @track("theme.change")
  accessor theme = "dark";
}
```

---

## API

### `@track(event, meta?)`

Multi-kind decorator for event tracking. Works on classes, methods, and accessors.

| Target   | When it fires           | Auto metadata                 |
| -------- | ----------------------- | ----------------------------- |
| Class    | `connectedCallback`     | `{ element: "tag-name" }`     |
| Method   | After method invocation | `{ method: "name", args }`    |
| Accessor | On set                  | `{ property: "name", value }` |

### `AnalyticsTransport`

Abstract class — implement to send events to any backend.

```ts
abstract class AnalyticsTransport {
  abstract track(event: string, meta?: Record<string, any>): void;
}
```

---

## Custom Transports

Swap backends with one DI line:

```ts
// Google Analytics
class GATransport extends AnalyticsTransport {
  track(event: string, meta?: Record<string, any>): void {
    gtag("event", event, meta);
  }
}

// Console (dev mode)
class ConsoleTransport extends AnalyticsTransport {
  track(event: string, meta?: Record<string, any>): void {
    console.log(`[analytics] ${event}`, meta);
  }
}

app.use(AnalyticsTransport, new GATransport());
```

Every `@track` in the app uses the registered transport. No component changes.

---

## Testing

```ts
import { MockAnalytics } from "@toyz/loom-analytics/testing";

const analytics = new MockAnalytics();
app.use(AnalyticsTransport, analytics);

// ... interact with component ...

// Assertions
analytics.assertTracked("button.save");
analytics.assertTracked("theme.change", { value: "light" });
analytics.assertNotTracked("page.error");

// Inspect history
console.log(analytics.events);
// [{ event: "button.save", meta: { ... }, timestamp: ... }]

// Reset between tests
analytics.reset();
```

---

## License

MIT
