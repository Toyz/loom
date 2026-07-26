# Changelog

## 0.22.0

A correctness and hardening pass over the whole framework. Several features in
this list had never worked at all; the rest are bugs the type checker and the
existing suite could not see.

### Added

- **`@hotkey` methods carry their printed shortcut.** The combo was already
  parsed, and `mod` already resolved to Meta on Mac and Ctrl elsewhere, in
  order to decide what to match — but nothing exposed that result, so any UI
  showing the shortcut had to retype it. That second copy could not be correct
  on both platforms at once. `hotkeyLabel(method)` returns the first combo
  printed for the current platform, `hotkeyLabels(method)` returns them all.
  Mac uses Apple's modifier order with no separators; elsewhere the parts join
  with `+`. Named keys print as names, so `escape` reads `Esc`.
- **`ApiOptions.enabled` gates a request.** The initial fetch was
  unconditional and runs when the accessor is first read — during the first
  render — so a query whose URL depends on a prop that arrives later fired
  once against `undefined`. While the gate is shut nothing is requested and
  the state reports `loading: false` with no data, because a request that has
  not been made is not one that is pending. It goes out on the first render
  after the gate opens.
- **`@service` works bare.** It was built with `createDecorator`, which always
  produces a factory, so the runtime called bare `@service` as
  `service(TheClass, context)` and got back the inner decorator function — and
  a class decorator's return value replaces the class. The class silently
  became an anonymous arrow function: `new TheClass()` threw "is not a
  constructor" and `.name` was empty, which is why the container reported "no
  provider for " with nothing after it. Both `@service` and `@service("Name")`
  now work; the DI docs showed the bare form throughout. No other class
  decorator is affected, because every one of them takes a required first
  argument and so cannot be written bare.
- **`@fetch`** — `@api` for the common case: a URL, optional params, JSON out.
  It goes through `ctx.fetch`, so `@intercept` handlers actually apply; a bare
  `fetch()` inside a hand-written `fn` bypasses the context and silently drops
  whatever an interceptor set. A non-2xx becomes an `HttpError` carrying the
  status and the parsed body, rather than being parsed as if it were data —
  `fetch()` only rejects on network failure, so this is the check most
  hand-rolled versions omit. The cache key defaults to the resolved URL, so a
  URL built from a prop refetches when that prop changes without a second
  declaration to keep in step.
- **`@watch(Service, "field")` works against `@reactive` fields.** It only ever
  worked when the property held a literal `Reactive` instance. A field declared
  `@reactive accessor count = 0` reads back as a plain number — the `Reactive`
  lives on a symbol the accessor closes over — so the `subscribe` check found
  nothing and threw "is not a Reactive", which is the form the DI docs
  describe. It now resolves the backing store for `@reactive`, `@store` and
  `@signal` fields, and the error names the fix when a field genuinely is not
  reactive.
- **A `@service` registered after `app.start()` now comes up.** Registration
  happens at class-definition time, so a service inside a lazily-loaded route
  module — the normal shape of a code-split app — was queued and then never
  looked at again, because `start()` is one-shot: `app.get()` threw "no
  provider" and its `@on` handlers never bound. Construction and handler
  binding are synchronous, so `app.get()` works the instant the class is
  registered; a `LoomLifecycle.start()` is awaited in the background.
  `app.start()` itself is still one-shot.
- **`@permission`** — reactive Permissions API state, in the shape of
  `@media`: resolves on connect, re-renders on change, unsubscribes on
  disconnect. Asking for a permission already denied wastes the ask — the
  prompt never appears, the API rejects, and there is no way to re-request
  from script — so a component can now answer that before it acts. An absent
  `navigator.permissions` and a `query()` that rejects for a name the engine
  does not implement both report `"unsupported"` rather than being collapsed
  into `"denied"`: denied means stop, unsupported means the browser will not
  say in advance, so attempt it and handle the failure. Disconnecting before
  the async query resolves attaches no listener and writes nothing to the
  detached element. Names come from a typed `Permission` registry so a call
  site does not depend on remembering a string, while a raw string still
  works — the parameter is deliberately not typed as lib.dom's
  `PermissionName`, whose union omits names browsers do implement, such as
  `clipboard-read`. `PermissionState` covers the comparison side, and
  `isGranted` / `willPrompt` / `isBlocked` / `canAttempt` encode the rules
  rather than leaving them to be re-derived — `canAttempt` deliberately
  includes `"unsupported"`, since a browser declining to answer in advance is
  not a browser refusing.
- **`LoomEvent<T>` payload events.** An event that is only a bag of data no
  longer needs a constructor written for it: declare the payload as a type
  parameter and it arrives as `.data`. `T` defaults to `void`, so every
  existing subclass is unaffected — the classic form is still right when an
  event has behaviour rather than just fields.
- **Derived dedup keys.** With a payload declared, `static dedupe = true`
  builds the frame-scoped dedup key from every field, and a list of names
  builds it from only those — for payloads carrying an incidental timestamp
  or request id that should not make two events distinct. Opt-in on purpose:
  deduping by default would silently drop the second of two identical
  commands. The key is namespaced by a per-class token rather than the class
  name, because the bus keeps one dedup set across all event types and a
  minifier rewrites names — the same hazard that makes `keepNames` matter.
  Benchmarked: `bus.emit` for an event with no dedup is unchanged (7.36M/s
  against a 7.22M/s baseline), because the resolved spec is cached per class
  rather than read off the constructor on every emit. A first attempt did
  read it every time and cost 12%.
- **`ApiStale` on the bus.** `.stale` and `.fetching` only tell the component
  that owns the accessor; anything else that wants to react — a sync
  indicator, a cache layer, a second view — has no reference to it. The
  transition is now announced as a bus event carrying the accessor name, the
  resolved cache key (the URL, with params, for `@fetch`) and the host, so
  `@on(ApiStale)` can match on a path prefix. Fires once per transition rather
  than per read, and fires whether or not the query revalidates. Emitted from
  a microtask, never synchronously from the getter: a handler that reads
  `.data` or calls `scheduleUpdate()` would otherwise run inside the render
  that triggered it and re-enter it.
- **`staleTime` now revalidates.** It marked data stale and stopped there, so
  "stale-while-revalidate" was only the first half — the flag sat true until
  something else changed the key, and both docs pages described the behaviour
  that did not exist. A stale read now refetches in the background: the cached
  data stays on screen, `fetching` goes true, and the new value replaces it.
  Exactly one request goes out however many times the accessor is read. Set
  `revalidate: false` to keep the old flag-only behaviour. `@rpc` in loom-rpc
  is unchanged and still marks without refetching.
- **`ApiState.fetching`.** Already tracked internally and never exposed.
  `loading` is false once data exists, so there was no way to show a
  background revalidation without blanking the screen. `loading` means "there
  is nothing to render yet"; `fetching` means "what you are looking at may be
  about to change". Optional in the type, because `ApiState` is a structural
  contract that packages outside this repo implement against whichever
  version of loom they depend on; loom's own `@api` always provides it.

### Documentation

- **`staleTime` does not revalidate.** Both the Fetch and RPC Queries pages
  described stale-while-revalidate: that a read past `staleTime` triggers a
  background refetch. It does not. `checkStale()` flips a boolean and nothing
  acts on it — a query re-runs when its arguments change, or when `refetch()`
  or `invalidate()` is called. The pages now say so, and `.stale` is
  described as a signal to act on.
- **`@inject` is not a parameter decorator.** Three pages showed it on
  constructor and factory parameters. Stage-3 decorators have no parameter
  form and the reader for it was deleted in this release, so those samples
  could never have run; they resolve from the container instead.

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
