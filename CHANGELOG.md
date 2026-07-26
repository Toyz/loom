# Changelog

## 0.22.0

A correctness and hardening pass over the whole framework. Several features in
this list had never worked at all; the rest are bugs the type checker and the
existing suite could not see.

### Breaking

- **Guards returning `LoomResult.err(new Error(...))` now block navigation.**
  They previously *allowed* it: `result.error as string ?? false` parses as
  `(result.error as string) ?? false`, so the `Error` object was returned and
  matched neither the `false` nor the `string` branch at the call site. Guards
  returning `err("/some-path")` are unaffected.
- **`<loom-outlet>` runs guards on cold load.** It used to call `matchRoute()`
  directly in `firstUpdated`, beating the router's async resolution, so guarded
  components rendered on direct URL entry. Guard side effects now happen there.
- **`@onRouteEnter` / `@onRouteLeave` fire.** `setOutlet()` had no callers, so
  these have never run. Handlers with side effects will now execute.
- **URLs keep their query string.** `router.go("/search?q=x")` used to navigate
  to `/search`. Matching and `RouteChanged.path` still use the bare path.
- **Route params are percent-encoded and decoded.** `buildPath` encodes,
  `matchRoute` decodes. Code that hand-encoded its own params will now
  double-decode.
- **An absent query param restores the prop's declared default** instead of
  `""` — which the numeric coercion had been turning into `0`, so
  `@prop({ query: "page" }) accessor page = 1` became `0` without `?page=`.
- **Built-in transforms need `accessor`:** `@toNumber accessor id!: number`.
  `toNumber`, `toBoolean`, `toDate`, `toJSON`, `toTrimmed`, `toInt` and
  `toFloat` were built on a `createTransform` using the legacy `(proto, key)`
  decorator signature under stage-3 decorators, so they threw at class
  definition on a plain field and silently no-oped on an accessor. None of them
  have ever worked; there is no working code to migrate.
- **Morph no longer resets `value` / `checked` / `selected` / `indeterminate`**
  unless the template declared them. It previously copied these from the
  freshly built element on every full re-render, destroying whatever the user
  had typed or ticked.
- **Arity-0 function props on intrinsic elements are reactive bindings.**
  `title={() => this.label}` now renders the value; it used to stringify the
  function source into the attribute. Custom elements are unaffected — they
  keep receiving zero-arg callbacks as JS properties.
- **`app.use(namedFunction)` is treated as a factory.** The old class check was
  true for every non-arrow function declaration, so a factory got `new`-ed. Use
  the new `app.useClass()` / `app.useFactory()` to be explicit.
- **`ApiOptions.fn` receives a second `ctx` argument** and `ApiState` gains
  `dispose()`. Additive for callers, but a type-surface change.
- `INJECT_PARAMS`, `GUARD_HANDLERS` and `FIRST_UPDATED_HOOKS` are deprecated.
  Nothing ever wrote them, and their readers have been removed. The symbols are
  still exported so imports resolve; they go away in 1.0. Constructor/parameter
  injection is not implementable under stage-3 decorators — use property
  injection, `@inject(Key) accessor`.

### Fixed

- Decorator metadata is now per-class. `PROPS`, `REACTIVES`, `ROUTE_PROPS`,
  `TRANSFORMS`, `COMPUTED_DIRTY`, `ROUTE_ENTER` and `ROUTE_LEAVE` were read
  through the static prototype chain and mutated in place, so sibling
  subclasses shared one object and saw the union of each other's fields.
- `ROUTE_PROPS` grew by one duplicate binding per element constructed; the
  outlet re-injected all of them on every navigation.
- Components driven by non-`Reactive` state (`@consume`, `@media`,
  `@fullscreen`, `@slot`, `@suspend`) never re-rendered after their first
  paint. `scheduleUpdate(force)` bypasses the trace-based skip.
- Conditional closure bindings went permanently stale.
  `{() => this.flag ? this.a : this.b}` captured `{flag, a}` at first render and
  never learned about `b`. Patchers are now re-traced.
- `@attribute` controllers inside a component's shadow root never unmounted —
  `disposeTree` bailed on a ShadowRoot's nodeType — so `@interval` timers kept
  firing and render nodes were orphaned on every mount/unmount cycle.
- `@attribute` reactive fields not read by the first render were never
  subscribed, and rich JSX args (`tooltip={{ text: this.label }}`) froze at
  their first value.
- A NaN-valued `Reactive` notified on every write (`NaN !== NaN`), re-rendering
  forever.
- A subscriber writing back into the same `Reactive` received stale values out
  of order.
- `Reactive.clear()` was undone by its own debounced persist;
  `swapStorage()` never enabled persistence.
- `SignalComputed` captured zero dependencies outside a trace and never
  invalidated — the JSDoc example returned `4` where it claimed `6` — and
  double-notified every subscriber.
- Parameterized `` css`...${value}...` `` returned the first call's stylesheet
  forever.
- `@on` handlers wired by `app.start()` were never removed, so
  `start(); stop(); start();` dispatched every event twice.
- `@factory` methods ran with `this` undefined.
- `@api` discarded the whole `ApiCtx` it built, so `@intercept` setting headers
  did nothing; a superseded slow response overwrote newer data; requests were
  never aborted on unmount; and reading `.data` started a fetch mid-render.
- `@transition` kept its current element per class rather than per instance, so
  one component's leave animation removed another's DOM.
- `@portal` re-wrapped `_flushUpdate` on every reconnect, re-rendering N times
  per update after N moves.
- `<loom-image>` never changed picture when `src` changed.
- `<loom-link>` duplicated its `<a>` and click listener on reconnect, hijacked
  cmd/ctrl/middle clicks, and never updated its href when `to` changed.
- `@clipboard`, `@draggable`, `@dropzone` and `@fullscreen` threw on a
  `LoomAttribute` controller.
- A throwing cleanup during disconnect skipped every remaining cleanup and left
  them queued to run again.
- `shouldUpdate()` was called twice per first render, so side-effecting
  overrides ran twice.
- In-segment route wildcards (`/files/*.png`) matched only the literal URL.

### Performance

Measured with interleaved A/B runs against the previous tree.

- `applyBindings` +18%, `canFastPatch` +24–26% — the dedup marker moved off the
  patcher function onto the binding object, avoiding a function hidden-class
  mutation.
- Morph: deep trees +15%, keyed reorder +11%, `patch value + JS props` +14%,
  wide lists +9%. The pooled child snapshot was being copied into a
  dictionary-mode object, which was slower than the plain array that replaced
  it, and retained detached DOM nodes.
- JSX: attribute closures +19%, text children +12%, `className` +9%.
  `class` closures are 8% slower, the cost of routing through one shared
  applier so the initial write and the patcher cannot diverge.
- `Reactive.set` on a NaN value +318%. Multi-subscriber dispatch is 5–6% slower:
  the value is re-read per subscriber, which is the ordering fix itself.
- `<loom-virtual>` keeps measured row heights across a `push()`.

New benchmark suites for the reactive core and the JSX runtime, neither of
which had any coverage.
