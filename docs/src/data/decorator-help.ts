/**
 * One-line explanations for every decorator that can appear in a code sample.
 *
 * Used by the <doc-tip> attribute controller, which attaches itself to every
 * decorator token rendered inside a code block. Keys are the bare name without
 * the leading "@".
 *
 * Keep each summary to a single sentence that says what the decorator DOES,
 * not what it is. If a decorator has a footgun worth knowing at a glance, that
 * belongs here more than a restatement of the name.
 */

export interface DecoratorHelp {
  /** One sentence. Present tense, active voice. */
  summary: string;
  /** Page that documents it in full. */
  to: string;
}

export const DECORATOR_HELP: Record<string, DecoratorHelp> = {
  // Component
  component: { summary: "Registers the class as a custom element and wires its observed attributes.", to: "/element/decorators" },
  styles: { summary: "Adopts one or more CSSStyleSheets into the component's shadow root on connect.", to: "/element/css" },
  dynamicCss: { summary: "Re-evaluates a CSS string whenever the reactive fields it reads change.", to: "/decorators/css" },
  attribute: { summary: "Registers a controller that attaches behaviour to any element carrying the attribute.", to: "/element/attributes" },

  // State
  reactive: { summary: "Marks state the template depends on; assigning schedules one render for the tick.", to: "/store/reactive" },
  prop: { summary: "A reactive field that is also an observed attribute, coerced to the declared type.", to: "/element/decorators" },
  computed: { summary: "Caches a derived value and recomputes it only when its dependencies change.", to: "/store/overview" },
  watch: { summary: "Calls the method with (next, prev) whenever the named field changes.", to: "/store/overview" },
  readonly: { summary: "Freezes the value and rejects writes from outside the component.", to: "/store/overview" },
  store: { summary: "A deeply reactive object; mutating a nested field triggers a render.", to: "/store/store-decorator" },
  persist: { summary: "Backs the field with a storage adapter and rehydrates it on construction.", to: "/store/storage" },
  signal: { summary: "A TC39-Signal-compatible reactive field, readable via .get() from outside.", to: "/store/signals" },

  // Events
  on: { summary: "Subscribes to a typed bus event or DOM event for as long as the element is connected.", to: "/decorators/events" },
  emit: { summary: "Publishes an event on the bus every time the named field changes.", to: "/decorators/events" },
  event: { summary: "Declares a typed callback prop. Note: it stores a callback, it does not dispatch a DOM event.", to: "/decorators/events" },

  // Lifecycle
  mount: { summary: "Runs once after the element connects.", to: "/element/lifecycle" },
  unmount: { summary: "Runs when the element disconnects.", to: "/element/lifecycle" },
  suspend: { summary: "Renders loading and error states around an async method.", to: "/element/lifecycle" },
  catch_: { summary: "Handles an error thrown by a render or an @api fetch on this component.", to: "/element/lifecycle" },

  // Timing
  interval: { summary: "Repeats the method every ms from connect until disconnect. Keeps running in a hidden tab.", to: "/element/timing" },
  timeout: { summary: "Runs the method once, ms after connect. Once per connect, not once per element.", to: "/element/timing" },
  debounce: { summary: "Defers the call until ms of silence; a burst collapses into the last call.", to: "/element/timing" },
  throttle: { summary: "Runs immediately, then at most once per ms. Leading and trailing.", to: "/element/timing" },
  animationFrame: { summary: "Joins the shared rAF loop, receiving (dt, timestamp). dt is 0 on the first frame.", to: "/element/timing" },

  // DOM
  query: { summary: "Lazily queries the shadow root each time the accessor is read.", to: "/element/queries" },
  queryAll: { summary: "Lazily queries all matches in the shadow root each time the accessor is read.", to: "/element/queries" },
  observer: { summary: "Wires an Intersection, Resize or Mutation observer and tears it down on disconnect.", to: "/element/observer" },
  hotkey: { summary: "Binds a keyboard shortcut while the element is connected.", to: "/decorators/hotkey" },
  clipboard: { summary: "Copies the method's return value, or receives pasted text in read mode.", to: "/decorators/clipboard" },
  draggable: { summary: "Makes the element draggable and serialises the method's return value as the payload.", to: "/decorators/dnd" },
  dropzone: { summary: "Accepts drops and hands the transferred data to the method.", to: "/decorators/dnd" },
  fullscreen: { summary: "Binds a boolean field to the element's fullscreen state.", to: "/decorators/fullscreen" },
  media: { summary: "Binds a boolean field to a media query.", to: "/decorators/media" },
  permission: { summary: "Binds a field to a browser permission state. unsupported is not the same as denied.", to: "/decorators/permission" },
  portal: { summary: "Renders part of the template into a different place in the DOM.", to: "/decorators/portal" },
  slot: { summary: "Exposes assigned slot children as a reactive array.", to: "/element/overview" },
  form: { summary: "Binds a form's fields, validation and dirty state to the component.", to: "/element/forms" },
  transition: { summary: "Plays enter and leave animations around a render method's output.", to: "/element/overview" },
  lazy: { summary: "Defers loading the real implementation until the element is needed.", to: "/element/lazy" },
  log: { summary: "Logs calls to the method, with timing.", to: "/decorators/log" },
  transform: { summary: "Pipes an incoming value through a function before it reaches the field.", to: "/decorators/transform" },

  // Router
  route: { summary: "Registers the component at a path, with optional guards and metadata.", to: "/router/routes" },
  guard: { summary: "Runs before a route renders; return false or a path to block or redirect.", to: "/router/guards" },
  group: { summary: "Prefixes a set of routes with a shared path segment.", to: "/router/groups" },
  onRouteEnter: { summary: "Runs when the route becomes active, receiving params and meta.", to: "/router/route-lifecycle" },
  onRouteLeave: { summary: "Runs when navigating away from the route.", to: "/router/route-lifecycle" },

  // DI + data
  service: { summary: "Registers the class as a singleton in the container, constructed on app.start().", to: "/di/overview" },
  inject: { summary: "Resolves a provider from the container on first read.", to: "/di/decorators" },
  maybe: { summary: "Resolves a provider if registered, otherwise yields undefined.", to: "/di/decorators" },
  factory: { summary: "Registers the method's return value as a provider during app.start().", to: "/di/decorators" },
  api: { summary: "Declarative async fetch with loading, error, retry and abort-on-unmount.", to: "/store/api" },
  fetch: { summary: "@api for a URL: interceptors apply, non-2xx throws, and the cache key is the resolved URL.", to: "/store/api" },
  intercept: { summary: "Runs before or after an @api request to modify the context or the response.", to: "/store/api" },
};
