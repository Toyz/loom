/**
 * Element — Decorators Quick Reference  /element/decorators
 *
 * Every decorator that applies to a component, grouped by what it does.
 *
 * The list is diffed against src/element/index.ts rather than written from
 * memory: the previous version had drifted 24 decorators behind the exports,
 * which is the one failure a cheat sheet cannot survive -- it is only useful
 * if a name missing from it is known not to exist.
 */
import { LoomElement } from "@toyz/loom";

/** Link to the page documenting a decorator in full. */
const to = (label: string, path: string) => (
  <loom-link to={path} class="ref">{label}</loom-link>
);

export default class PageElementDecorators extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Decorators"
          subtitle="Every decorator that applies to a component, grouped by what it does."
        ></doc-header>

        <section>
          <p>Use this to find the name you half-remember. Each entry links to the page that documents the behaviour and the footguns.</p>
          <p>Two things are worth knowing before you scan. What a decorator attaches to — class, field, accessor or method — is part of its contract and not interchangeable. And a decorator that <em>wraps</em> your method only runs when you call it, while one that <em>registers a hook</em> runs on its own.</p>
        </section>

        <doc-section heading="Registration">
          <api-table
            head={["Decorator", "Target", "What it does"]}
            rows={[
              [<code>@component(tag, opts?)</code>, "Class", <>Register a custom element. <code>{"{ shadow: false }"}</code> for light DOM, <code>{"{ formAssociated: true }"}</code> to participate in a form — {to("Overview", "/element/overview")}</>],
              [<code>@styles(sheet, ...)</code>, "Class", <>Adopt constructable stylesheets — {to("CSS", "/element/css")}</>],
              [<code>@attribute(name)</code>, "Class", <>A controller that attaches to any element carrying the attribute, with no custom tag — {to("Attributes", "/element/attributes")}</>],
              [<code>@lazy(loader)</code>, "Class", <>Load the implementation on demand — {to("Lazy Loading", "/element/lazy")}</>],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="State">
          <api-table
            head={["Decorator", "Target", "What it does"]}
            rows={[
              [<code>@reactive</code>, "Accessor", <>Internal state. Writing to it schedules <code>update()</code></>],
              [<code>@prop</code>, "Accessor", "External attribute/property, parsed and reflected"],
              [<code>@computed</code>, "Getter", "Derived value, recomputed only when a dependency changes"],
              [<code>@readonly</code>, "Accessor", "Freezes objects and throws on reassignment"],
              [<code>@transform(fn)</code>, "Accessor", <>Coerce a value on write — {to("Transform", "/decorators/transform")}</>],
              [<code>@form&lt;T&gt;(schema)</code>, "Accessor", <>Form state with validation and dirty tracking, independent of the DOM — {to("Forms", "/element/forms")}</>],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="Lifecycle">
          <api-table
            head={["Decorator", "Target", "What it does"]}
            rows={[
              [<code>@mount</code>, "Method", <>Run on connect — {to("Lifecycle", "/element/lifecycle")}</>],
              [<code>@unmount</code>, "Method", <>Run on disconnect — {to("Lifecycle", "/element/lifecycle")}</>],
              [<code>@catch_(handler)</code>, "Class/Method", <>Error boundary — {to("Lifecycle", "/element/lifecycle")}</>],
              [<code>@suspend()</code>, "Method", <>Async suspense — {to("Lifecycle", "/element/lifecycle")}</>],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="DOM access">
          <api-table
            head={["Decorator", "Target", "What it does"]}
            rows={[
              [<code>@query(sel)</code>, "Field", <>querySelector in the shadow root — {to("Queries", "/element/queries")}</>],
              [<code>@queryAll(sel)</code>, "Field", <>querySelectorAll in the shadow root — {to("Queries", "/element/queries")}</>],
              [<code>@slot(name?)</code>, "Field", "Slot-assigned elements, updated on slotchange"],
              [<code>@dynamicCss</code>, "Method", <>Styles recomputed from state — {to("Dynamic CSS", "/decorators/css")}</>],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="Element internals">
          <p>What makes a component a first-class element rather than a tag the platform knows nothing about — {to("Element Internals", "/decorators/internals")}.</p>
          <api-table
            head={["Decorator", "Target", "What it does"]}
            rows={[
              [<code>@formValue</code>, "Accessor", <>Submit this value with the surrounding <code>&lt;form&gt;</code></>],
              [<code>@validity(fn)</code>, "Accessor", "Report through the browser's own constraint validation"],
              [<code>@state(name?)</code>, "Accessor", <>Mirror a boolean into <code>:state(name)</code>, selectable from outside the shadow root</>],
              [<code>@aria(props)</code>, "Class", "A default role and ARIA properties, without host attributes"],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="Events &amp; interaction">
          <api-table
            head={["Decorator", "Target", "What it does"]}
            rows={[
              [<code>@event&lt;T&gt;()</code>, "Accessor", <>Typed callback prop — {to("Events", "/decorators/events")}</>],
              [<code>@on(EventClass)</code>, "Method", <>Listen on the bus, or to a DOM event — {to("Events", "/decorators/events")}</>],
              [<code>@emit(EventClass)</code>, "Method", <>Dispatch the returned event — {to("Events", "/decorators/events")}</>],
              [<code>@observer(type, opts?)</code>, "Method", <>Resize/Intersection/Mutation observer, disconnected for you — {to("Observer", "/element/observer")}</>],
              [<code>@hotkey(combo)</code>, "Method", <>Keyboard shortcut, with a printable label — {to("Hotkey", "/decorators/hotkey")}</>],
              [<code>@clipboard(mode)</code>, "Method", <>Copy and paste — {to("Clipboard", "/decorators/clipboard")}</>],
              [<code>@draggable(opts?)</code>, "Method", <>Make it draggable — {to("Drag & Drop", "/decorators/dnd")}</>],
              [<code>@dropzone(opts?)</code>, "Method", <>Accept a drop — {to("Drag & Drop", "/decorators/dnd")}</>],
              [<code>@selection(opts?)</code>, "Method", <>Report the document selection — {to("Selection", "/decorators/selection")}</>],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="Overlays &amp; motion">
          <api-table
            head={["Decorator", "Target", "What it does"]}
            rows={[
              [<code>@popover(opts?)</code>, "Accessor", <>Drive a <code>[popover]</code> on the top layer — {to("Popover & Dialog", "/decorators/overlay")}</>],
              [<code>@dialog(opts?)</code>, "Accessor", <>Drive a <code>&lt;dialog&gt;</code>, modal by default — {to("Popover & Dialog", "/decorators/overlay")}</>],
              [<code>@portal(target)</code>, "Method", <>Render into a different part of the DOM — {to("Portal", "/decorators/portal")}</>],
              [<code>@viewTransition(opts?)</code>, "Class", <>Wrap full renders in a view transition — {to("View Transitions", "/decorators/view-transition")}</>],
              [<code>@transition(opts)</code>, "Method", "Enter/leave CSS animations for conditional DOM"],
              [<code>@animate(sel, frames, opts?)</code>, "Field", <>Web Animations, cancelled on disconnect — {to("Animate", "/decorators/animate")}</>],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="Timing">
          <api-table
            head={["Decorator", "Target", "What it does"]}
            rows={[
              [<code>@interval(ms)</code>, "Method", <>setInterval, cleared on disconnect — {to("Timing", "/element/timing")}</>],
              [<code>@timeout(ms)</code>, "Method", <>setTimeout, cleared on disconnect — {to("Timing", "/element/timing")}</>],
              [<code>@debounce(ms)</code>, "Method", <>Debounce — {to("Timing", "/element/timing")}</>],
              [<code>@throttle(ms)</code>, "Method", <>Throttle — {to("Timing", "/element/timing")}</>],
              [<code>@animationFrame</code>, "Method", <>A shared rAF loop — {to("Timing", "/element/timing")}</>],
              [<code>@idle(opts?)</code>, "Method", <>requestIdleCallback. Pass a <code>timeout</code>, or a page that never idles never runs it — {to("Timing", "/element/timing")}</>],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="Data &amp; connections">
          <api-table
            head={["Decorator", "Target", "What it does"]}
            rows={[
              [<code>@api&lt;T&gt;(opts)</code>, "Accessor", <>Declarative async state — {to("Fetch", "/store/api")}</>],
              [<code>@fetch&lt;T&gt;(url)</code>, "Accessor", <>The URL case of <code>@api</code>: status-checked, interceptors applied — {to("Fetch", "/store/api")}</>],
              [<code>@intercept()</code>, "Method", <>Pre/post-fetch interceptors — {to("Fetch", "/store/api")}</>],
              [<code>@sse&lt;T&gt;(url, opts?)</code>, "Method", <>Server-Sent Events with backoff — {to("SSE & WebSocket", "/decorators/streams")}</>],
              [<code>@socket&lt;T&gt;(url, opts?)</code>, "Method", <>A WebSocket that closes on disconnect — {to("SSE & WebSocket", "/decorators/streams")}</>],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="Platform">
          <api-table
            head={["Decorator", "Target", "What it does"]}
            rows={[
              [<code>@media(query)</code>, "Accessor", <>A media query as a boolean — {to("Media", "/decorators/media")}</>],
              [<code>@visible</code>, "Accessor", <>True while the page is visible — {to("Visibility & Network", "/decorators/environment")}</>],
              [<code>@online</code>, "Accessor", <>True while the browser thinks it is online — {to("Visibility & Network", "/decorators/environment")}</>],
              [<code>@permission(name)</code>, "Accessor", <>Permission state, before you trigger the API — {to("Permission", "/decorators/permission")}</>],
              [<code>@fullscreen()</code>, "Accessor", <>The Fullscreen API as a boolean — {to("Fullscreen", "/decorators/fullscreen")}</>],
              [<code>@geolocation(opts?)</code>, "Method", <>Watch position, cleared on disconnect — {to("Device APIs", "/decorators/device")}</>],
              [<code>@wakeLock</code>, "Class", <>Hold a screen wake lock — {to("Device APIs", "/decorators/device")}</>],
            ]}
          ></api-table>
        </doc-section>

        <doc-section heading="Context &amp; services">
          <api-table
            head={["Decorator", "Target", "What it does"]}
            rows={[
              [<code>@context(Key)</code>, "Accessor", <>Share data across shadow boundaries — {to("Context", "/decorators/context")}</>],
              [<code>@provide(Key)</code>, "Accessor", <>Provide a context value to descendants — {to("Context", "/decorators/context")}</>],
              [<code>@consume(Key)</code>, "Accessor", <>Consume the nearest provided value — {to("Context", "/decorators/context")}</>],
              [<code>@log(opts?)</code>, "Method", <>Structured logging — {to("Log", "/decorators/log")}</>],
            ]}
          ></api-table>
          <p class="note">
            <code>@inject</code>, <code>@service</code> and <code>@factory</code> come from the
            container rather than the element — see {to("Services", "/di/decorators")}.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}
