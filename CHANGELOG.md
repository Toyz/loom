# Changelog

## Unreleased

### Added

- **`@prop({ query, sync })` writes the URL back.** A query binding was one-way:
  the URL set the property, and setting the property left the address bar
  behind. For anything the user changes -- a filter, a page number, a search
  box -- that means the URL stops describing what is on screen, so refresh,
  share and bookmark lose the state and Back does not undo the change.

  Opt-in per binding, so nothing existing changes shape. `history` chooses
  replace (default) or push, `debounce` keeps a text input from writing per
  keystroke, and a value equal to the property's declared default removes the
  key instead of writing it -- `accessor page = 1` leaves no `?page=1` behind.
  Each key is written independently, so two synced props cannot clobber each
  other.

  `sync` is only reachable on a single query key. The type rejects it on
  `param` (a path param cannot change without re-routing), on `meta` (static
  config) and on `routeQuery` (writing the whole object back would mean
  diffing it), rather than accepting it and ignoring it at runtime.

### Fixed

- `css.lazy`'s doc comment claimed it made a module importable outside a
  browser, "for a framework that renders declarative shadow DOM on a server".
  Loom hydrates DSD that something else emitted and does not render on a
  server, and the claim was not even achievable -- `LoomElement extends
  HTMLElement` is evaluated at import regardless. The rationale was written
  around the feature rather than the other way round.

## 0.23.0

Platform APIs. Loom builds custom elements and had never touched
`attachInternals()`, which is the one browser API a web-components framework
cannot skip -- and the reason a Loom component was second-class in a plain HTML
page. That, plus the modern DOM features that were being hand-rolled around it.

### Added

- **Form-associated custom elements.** `@component(tag, { formAssociated: true })`
  plus `@formValue` and `@validity`. A component inside a `<form>` was furniture:
  it submitted nothing, `form.elements` did not list it, validation skipped it,
  and reset left it alone. `@form` manages state but is deliberately
  DOM-independent, so nothing in Loom ever made a component visible to the form
  it was sitting in. Values submit under the host's `name` (booleans use
  checkbox semantics), validators report through `internals.setValidity` so
  `form.checkValidity()`, `:invalid` and the browser's own validation bubble all
  work, and reset restores the constructed value.
- **`@state` -- CSS `:state()`.** Mirrors a boolean accessor into a custom
  state, selectable as `my-el:state(loading)` from anywhere including outside
  the shadow root. The sanctioned replacement for toggling a class on the host,
  which is public markup anything can overwrite; a custom state cannot be
  written from outside the component.
- **`@aria`** -- a default role and ARIA properties that live on the element
  rather than in its attributes, so they cannot be lost when someone writes the
  tag without them. `setAria()` for values that change.
- **`@viewTransition`** -- full renders run inside
  `document.startViewTransition`. View transitions want one synchronous DOM
  mutation between two snapshots, which is exactly what `morph` already is: a
  single entry point applying the whole update in one pass. Fast-patches are
  not wrapped -- a text or attribute write is not the structural change this
  exists to animate, and snapshotting the page to cross-fade a counter costs
  more than it shows.
- **`@popover` and `@dialog`** -- the browser's top layer, driven by a boolean.
  An element there paints above everything regardless of tree position, so it
  does not need relocating out of its shadow root to escape a stacking context
  -- which is what `@portal` exists for and why it is usually no longer
  necessary. Light dismiss, Escape, `::backdrop`, focus handling and (for
  modals) making the page inert all come from the platform. Escape or a click
  outside writes `false` back to the accessor, so state and DOM cannot drift.
- **`@visible` / `@online`**, over one shared listener each rather than one per
  component, attached only while something is subscribed. Also exported as
  `isVisible()`, `onVisibilityChange()`, `isOnline()`, `onOnlineChange()`.
- **`@idle`** -- `requestIdleCallback` with cleanup, falling back to a timer on
  Safari, which has never shipped it.
- **`@animate`** -- Web Animations keyframes, cancelled on disconnect. An
  `Animation` outlives the element it was started on, so a component that
  starts one per connect leaks a live animation on every mount. Starts after
  the first render, since the target does not exist before it.
- **`@sse` and `@socket`** -- long-lived connections with exponential capped
  backoff, closed on disconnect. A socket opened in `connectedCallback` keeps
  its handlers, and therefore the component and its whole DOM subtree,
  reachable after the element is gone, while a reconnect timer keeps firing at
  a detached host.
- **`@geolocation`, `@wakeLock`, `share()`** -- each releases what it acquires.
  A `watchPosition` left running keeps the GPS on; a wake lock is dropped
  whenever the page hides and is re-acquired on return, without which it
  survives exactly one tab switch.
- **`@selection` and the CSS Custom Highlight API.** `highlight()` styles text
  ranges without wrapping them in elements -- the wrapping approach destroys
  the user's selection, moves focus, invalidates held node references and
  re-lays out the block. `findRanges()` finds occurrences to feed it.
- **`IndexedDBAdapter`** for `@persist`: an in-memory mirror serving the
  synchronous `StorageAdapter` contract, with writes behind it. No practical
  size limit, against localStorage's ~5MB. Await `ready` before `app.start()`.
- **`PersistOptions.sync`** -- adopt writes made to the same key by another
  tab. Without it two tabs diverge the moment either writes: each holds its own
  copy and only reads storage once, at construction, so the last writer wins the
  stored value while both keep rendering something else. Opt-in, because turning
  it on changes what an existing app does.
### Documentation

- The element decorator reference had drifted **24 decorators** behind the
  exports. It is now generated against `src/element/index.ts` and grouped by
  what each decorator does, rather than ending in a "Miscellaneous" bucket, and
  uses the shared `<api-table>` instead of hand-written markup.
- Fixed **144 lost spaces**. JSX drops a newline sitting between a tag and
  text, so `<span>keepNames</span>` followed by a line break rendered as
  "keepNamesmatter". 33 of those had been papered over with a space *inside*
  the code chip, which the chip's background then painted. Both are now
  explicit `{" "}`.
- The example components were rendering in a different design system: an older
  purple accent, a generic utility palette, `Inter`, and 6-12px radii against a
  system that specifies die-cut 2px. Mapped onto the docs tokens -- including
  `t.$value` for the canvas demo and icon colours, where `var()` cannot reach.

- **`tokens()` — design tokens declared once.** A component stylesheet's
  loudest line is usually `var(--text-muted, #6d6858)`, repeated for every
  property that wants a colour. The repetition is not just noise: each copy is
  hand-written so the fallbacks drift, and a fallback only renders when the
  token is undefined -- exactly when nobody is looking. What accumulates is a
  second, contradictory palette behind the real one. These docs carried 479 of
  them, with `--text-muted` on five different fallbacks and `--accent` on two
  unrelated purples. `tokens({ textMuted: "#6d6858" })` gives `t.textMuted`,
  and `t.$sheet` emits the declarations from the same literals, so the
  definition and the fallback cannot disagree. `t.$value` exposes the raw
  values for a canvas or anywhere else `var()` cannot go.
- **`css` sheets compose.** A sheet can be interpolated into another
  (`css`${base} .x { ... }``), so a shared block is written once rather than
  pasted. `cssText(sheet)` returns the source a sheet was built from.
- **`@sse` and `@socket` are generic.** `@sse<Price>(url)` types the handler's
  `MessageEvent<Price>`, and the type argument is now a real constraint -- the
  decorator returns a narrowed decorator type, where before the method was
  typed `Function` and any payload type written at the call site was accepted
  and never checked. A `json: true` option parses `event.data` first, so the
  declared type describes what arrives rather than an intention; a frame that
  fails to parse goes to `onError` instead of reaching the handler.
- **`RouterOptions.transitions`** -- animate navigations through
  `document.startViewTransition`. A route change swaps the outlet in one
  synchronous DOM mutation, which is the shape a view transition wants; wiring
  it on the router rather than at each `router.go()` means back/forward and
  guard redirects animate too, since they reach the same swap without passing
  through a call site an app could wrap.
- **JSX knows about the top layer.** `popover`, `popoverTarget`,
  `popoverTargetAction`, `inert` and `open` are typed on intrinsic elements --
  without them `@popover` shipped with no way to declare its own target in a
  template.
- **`ApiOptions.pauseWhenHidden`** (default true) -- stale revalidation is
  deferred while the page is hidden and runs when it returns, if still stale. A
  background tab refreshing on a timer spends requests, and on a phone radio
  wake-ups, to update pixels nobody is looking at.

### Fixed

- View transitions no longer leak unhandled rejections or wedge the page. A
  `ViewTransition` exposes three promises -- `ready`, `finished` and
  `updateCallbackDone` -- and all three reject when one is skipped; only
  `finished` was caught, so a skipped transition surfaced as "Uncaught (in
  promise) AbortError" or "InvalidStateError: Transition was aborted because of
  invalid state". Starting one while another is live now skips the outgoing one
  explicitly instead of leaving the browser to abort whichever it likes, a
  hidden document is never asked to snapshot (it throws), and a watchdog skips
  anything still running after 3s. The last one matters most: while a
  transition is live the document paints from snapshots and its pseudo-element
  tree sits above everything, so one that never settles leaves an overlay that
  swallows every click -- a page that is not hung, just covered.
- **Reconciliation only removes attributes the template declared.** It removed
  anything on the element that the new tree did not have, which tore off state
  no template ever set: `showModal()` sets `open` on a `<dialog>`, and a user
  clicking a `<summary>` sets `open` on a `<details>`. For a modal that is the
  documented way to strand one -- it disappears, the page stays inert behind
  it, and no `close` event fires, so bound state stays stuck on "open". For a
  disclosure it snapped shut under the reader on the next unrelated render.
  JSX now records which attributes it set, and only those are removable --
  the same rule `value` and `checked` already followed, rather than a list of
  special-cased elements. Elements Loom did not create (hydrated markup) keep
  the previous behaviour, since there is no declaration to compare against.
- **`@dialog` detects a close that fires no event.** A
  `<form method="dialog">` submit closes a dialog inside a shadow root
  *without* dispatching `close` in Chrome -- confirmed against identical markup
  in both trees, where the light DOM fires it and the shadow DOM does not.
  Every component renders into a shadow root, so that was the normal path, and
  it left the accessor reading "open" for a dialog that had gone. The `open`
  attribute is now observed as well, which catches every way a dialog closes.
- `@dialog` closes an overlay element that a render replaced. A modal whose
  node was swapped kept the top layer, leaving the page inert behind a dialog
  no longer in the document.
- `LoomElement.emit()` accepts payload events. Its constraint was a bare
  `LoomEvent`, meaning `LoomEvent<void>`, so no `LoomEvent<T>` subclass was
  assignable.

### Notes

Every one of these is feature-detected and degrades rather than throws.
`attachInternals` is absent before Safari 16.4, view transitions are absent in
Firefox, the popover API predates Firefox 125, `requestIdleCallback` has never
shipped in Safari, and `CSS.highlights` predates Firefox 140. Where an API is
missing the component still renders and the state still works; only the
corresponding browser behaviour is lost. `supportsInternals()`,
`supportsViewTransitions()`, `supportsAnimations()` and `supportsHighlights()`
report support where a caller needs to branch.

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

- **The decorator count was wrong, and now cannot be.** The home page claimed
  41; there are 56. Fourteen decorators had been documented without ever being
  added to the list that drives the count — `@attribute`, `@store`, `@signal`,
  `@lazy`, `@form`, `@slot`, `@styles`, `@persist`, `@transition`, `@event`,
  `@maybe`, `@dynamicCss`, `@onRouteEnter`, `@onRouteLeave` — and `@api`,
  `@intercept`, `@fetch` and `@permission` were missing too. The count also
  included `createDecorator` and the transform helpers, which are functions
  you call rather than decorators you apply. The docs build now fails if the
  list, the doc-tip summaries and loom's actual exports disagree, because a
  wrong count looks exactly like a right one.
- **Real numbers on the home page.** It made qualitative performance claims
  and cited nothing. It now shows a table where every figure is checkable:
  core bundle size and test count are read from this repository at build time
  so they cannot go stale, and the Lighthouse figures (99, 0ms TBT, FCP and
  LCP both 0.7s, CLS 0) are labelled as coming from a production site rather
  than from the docs. The page also states the honest limit of TBT — it is a
  load metric and says nothing about interaction afterwards.
- **`<doc-demo>`, and the demos restyled.** A code block on an examples page
  was obviously an object — bounded, with a header strip and a punched gutter
  — while the demo beside it floated in the prose with no frame at all, so
  the one thing actually running read as less substantial than a static
  listing of it. Every demo now sits in the same surface a code block uses,
  with a LIVE strip and its instruction printed along the foot.
  Three things made the demos look pasted in from another site, and all three
  are fixed: 87 rounded corners and pill chips in a design that is square
  everywhere else (circles kept, where the shape carries meaning); and
  `--surface`, `--surface-2`, `--surface-3`, `--border` and `--text`, which
  no longer exist as tokens — so all seventeen demo components had been
  rendering their hardcoded blue-grey fallbacks against a warm olive ground.
  Those are aliased into the system rather than rewritten, so a usage missed
  in one component still lands in the palette.
- **`<api-table>`.** There were 101 hand-written reference tables across the
  docs — table, thead, a row of th, then a tbody of tr/td — which is the same
  drift risk the page skeleton had before `<doc-section>`: a column count that
  does not match its header, a missing tbody, a phase row styled by hand.
  Cells take a string or a node, since most carry a `<code>` or a link, and a
  `{ phase }` row spans every column for tables whose rows are a sequence.
  Thirty converted by codemod, verified cell-by-cell against the previous
  markup with nothing lost; the other 71 hold JSX the codemod could not prove
  safe to move and were left alone rather than guessed at.

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

- **Relative imports in the published output now carry file extensions, and
  `moduleResolution` is `nodenext`.** All five packages are `"type": "module"`
  and shipped 250+ extensionless relative imports. Bundlers resolve those, so
  every browser build, the docs site and the whole test suite were fine --
  and Node was not. `import "@toyz/loom"` from Node, or from Vitest resolving
  it as a dependency, died on `Cannot find module .../dist/app`. Nothing in the
  repo imported `dist` under Node, so nothing caught it. Anyone patching around
  it with a bundler alias can drop the alias. `npm run check:dist` now fails
  the build if it comes back.

- **Routes match by specificity, not registration order.** Matching took the
  first pattern that matched and the table was in import order, so whether
  `@route("/user/new")` was reachable at all depended on which module happened
  to be imported before `@route("/user/:id")` -- and nothing about either
  declaration said so. Patterns are now compared segment by segment (exact
  beats a partial wildcard, beats a named param, beats a splat), first
  disagreement decides, and the bare `*` catch-all is last by definition. Ties
  keep registration order. An app that was relying on a *less* specific route
  winning will now resolve to the more specific one.
- **A payload's `data` is `Readonly`.** One event object reaches every handler
  in registration order, so a handler that wrote to `e.data` changed what
  every later handler saw, and which handler won depended on registration
  order. Handlers that mutate the payload will now fail to compile; send
  `e.clone({ data: ... })` instead. Runtime behaviour is unchanged -- this is
  a compile-time guarantee, not `Object.freeze` (see Performance).
- **A gate that reopens refetches.** `enabled` flipping back to true only
  fetched when `data` was still `undefined`, so a query whose gate shut and
  reopened -- a tab switched away from and back, a re-login -- went on serving
  whatever it had loaded the first time, and could never fetch again because
  the gate stayed unarmed. Reopening now refetches unless `staleTime` says the
  data is still fresh.
- **`@rpc` revalidates on `staleTime`.** It marked `.stale` and stopped there,
  so stale-while-revalidate was only its first half and a query with
  `staleTime` set behaved like one without. It now refetches in the background
  and emits `ApiStale`, matching `@api` and `@fetch`. Set `revalidate: false`
  for the old behaviour. Requires `@toyz/loom` 0.22.0.

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

- `@toyz/loom` and every sibling import cleanly under Node, so a Loom app can
  finally have a test runner. All 16 export subpaths are verified.
- Sibling packages declared `@toyz/loom` `^0.12.8` against a core at `0.22.0`.
  Each builds against a linked local checkout in CI, so nothing ever resolved
  the declared range and the drift was invisible; installing
  `@toyz/loom-flags` pulled a ten-minor-versions-old core alongside it.
  `npm run check:versions` now fails on it.
- A `@factory` registered after `app.start()` now runs. `start()` invoked the
  queued factories once and never looked again, so a factory declared in a
  lazily-loaded module produced no provider at all and the class it built
  stayed unresolvable for the life of the app -- the same gap late `@service`
  registration had, one level down. Each factory still runs exactly once, and
  the late path is deferred to a microtask so the method is bound to its
  owning service first.
- `bus.emit()` and `@on` accept payload events. Every signature constrained on
  a bare `LoomEvent`, which means `LoomEvent<void>`, so no `LoomEvent<T>`
  subclass was assignable -- the payload form did not typecheck at its main
  call site. Constraints are now `LoomEvent<any>`.
- `@fetch`'s derived key includes the names of its `use` interceptors, so
  swapping the interceptor set refetches. An interceptor whose contribution
  varies at runtime (a tenant header, an acting-user param) still has to go in
  `key` explicitly -- interceptors run inside the request, after the key has
  been compared. Nothing is shared between components either way; the state is
  per instance.
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

### Tooling

- **`@toyz/create-loom` 0.3.0.** It had no gate of any kind -- its workflow was
  `npm publish` and nothing else -- and had drifted from what the docs promised.
  - Ships a test runner, which the getting-started page already claimed:
    vitest, happy-dom, a `vitest.setup.ts` that calls `app.start()` (without it
    a test mounts an element the browser never upgrades), and a first test.
  - Ships a `.gitignore`. It could not have before: npm strips a literal
    `.gitignore` from a published tarball, so it ships as `_gitignore` and the
    CLI renames it -- the standard fix, and one the template was missing.
  - `tsc` no longer emits into `dist/` just for Vite to delete it (`noEmit`,
    and `vite/client` types so `import.meta.env` typechecks).
  - The usage message said `npm create loom`, which resolves to an unscoped
    package belonging to somebody else. It is `npm create @toyz/loom`.
  - Scaffolding into `.` skipped every safety check and would overwrite an
    existing project without a word.
  - A directory name is normalised into a legal npm package name, instead of
    writing `My-App` into a `package.json` npm refuses to publish.
  - The template pins a real `@toyz/loom` version rather than `latest`.

- **One release workflow replaces six.** `publish.yml` and its five siblings
  were near-identical copies with six tag prefixes and 124 tags to show for it.
  Three published without running tests, one published without building, one
  skipped `--provenance`, and nothing checked the tag against the version in
  `package.json`. Releasing is now Actions -> Release -> pick `changed`, `all`,
  or one package, and a bump. Tags are pushed after a successful publish, so a
  tag records what shipped rather than triggering it. See
  [RELEASING.md](RELEASING.md).

- **CI covers every package.** It gated core and loom-rpc; analytics, flags,
  placeholder, create-loom and the docs site had none -- which is how the stale
  version ranges and the broken scaffolder both went unnoticed. One matrix job
  now reads [`scripts/packages.mjs`](scripts/packages.mjs), so adding a package
  is a manifest entry rather than another copied workflow.

- `npm run verify` runs the full local gate; `npm run changed` shows what a
  `changed` release would pick and why.

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
- Event emit is unchanged. Making a payload immutable at runtime cost 15% of
  emit, and most of that was not `Object.freeze` itself -- a frozen object
  reads slower for the rest of its life, and every handler is a reader. An
  opt-in flag checked per construction still cost 7%, because the check is per
  event while the mistake is per line of source. `Readonly<T>` on the field
  catches it where catching it is free and emits identical JavaScript.

New benchmark suites for the reactive core and the JSX runtime, neither of
which had any coverage.
