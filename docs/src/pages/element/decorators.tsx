/**
 * Element — Decorators Quick Reference  /element/decorators
 *
 * Cheat sheet linking to dedicated pages for each decorator.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementDecorators extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Decorators" subtitle="Quick reference for all element decorators. Click any decorator for full documentation."></doc-header>

        <section>
          <p>Every decorator that applies to a component, on one page, grouped by what it does rather than alphabetically. Use it to find the name you half-remember; each entry links to the page that documents the behaviour and the footguns.</p>
          <p>Two things are worth knowing before you scan the list. What a decorator attaches to — class, field, <span class="ic">accessor</span> or method — is part of its contract and not interchangeable. And a decorator that wraps your method only runs when you call it, while one that registers a hook runs on its own.</p>
        </section>

        {/* ═══════════ Registration ═══════════ */}

        <doc-section heading="Registration">
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@component(tag)</code></td><td>Class</td><td>Register custom element — <loom-link to="/element/overview" style="color: var(--accent)">Overview</loom-link></td></tr>
              <tr><td><code>@styles(sheet, ...)</code></td><td>Class</td><td>Auto-adopt CSSStyleSheets — <loom-link to="/element/css" style="color: var(--accent)">CSS</loom-link></td></tr>
            </tbody>
          </table>
        </doc-section>
        {/* ═══════════ State ═══════════ */}

        <doc-section heading="State">
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@reactive</code></td><td>Accessor</td><td>Internal reactive state, triggers <code>update()</code></td></tr>
              <tr><td><code>@prop</code></td><td>Accessor</td><td>External attribute/property, auto-parsed</td></tr>
              <tr><td><code>@computed</code></td><td>Getter</td><td>Cached derived value</td></tr>
              <tr><td><code>@readonly</code></td><td>Accessor</td><td>Runtime immutability — freezes objects, throws on reassign</td></tr>
            </tbody>
          </table>
        </doc-section>
        {/* ═══════════ Lifecycle ═══════════ */}

        <doc-section heading="Lifecycle">
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@mount</code></td><td>Method</td><td>Run on connect — <loom-link to="/element/lifecycle" style="color: var(--accent)">Lifecycle</loom-link></td></tr>
              <tr><td><code>@unmount</code></td><td>Method</td><td>Run on disconnect — <loom-link to="/element/lifecycle" style="color: var(--accent)">Lifecycle</loom-link></td></tr>
              <tr><td><code>@catch_(handler)</code></td><td>Class/Method</td><td>Error boundary — <loom-link to="/element/lifecycle" style="color: var(--accent)">Lifecycle</loom-link></td></tr>
              <tr><td><code>@suspend()</code></td><td>Method</td><td>Async suspense — <loom-link to="/element/lifecycle" style="color: var(--accent)">Lifecycle</loom-link></td></tr>
            </tbody>
          </table>
        </doc-section>
        {/* ═══════════ DOM ═══════════ */}

        <doc-section heading="DOM">
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@query(sel)</code></td><td>Field</td><td>Shadow DOM querySelector — <loom-link to="/element/queries" style="color: var(--accent)">Queries</loom-link></td></tr>
              <tr><td><code>@queryAll(sel)</code></td><td>Field</td><td>Shadow DOM querySelectorAll — <loom-link to="/element/queries" style="color: var(--accent)">Queries</loom-link></td></tr>
              <tr><td><code>@slot(name?)</code></td><td>Field</td><td>Typed slot-assigned elements, auto-updates on slotchange</td></tr>
            </tbody>
          </table>
        </doc-section>
        {/* ═══════════ Events & Interaction ═══════════ */}

        <doc-section heading="Events & Interaction">
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@event&lt;T&gt;()</code></td><td>Accessor</td><td>Typed callback prop — <loom-link to="/decorators/events" style="color: var(--accent)">Events</loom-link></td></tr>
              <tr><td><code>@on(EventClass)</code></td><td>Method</td><td>Declarative event listener — <loom-link to="/decorators/events" style="color: var(--accent)">Events</loom-link></td></tr>
              <tr><td><code>@emit(EventClass)</code></td><td>Method</td><td>Dispatch typed events — <loom-link to="/decorators/events" style="color: var(--accent)">Events</loom-link></td></tr>
              <tr><td><code>@transition(opts)</code></td><td>Method</td><td>Enter/leave CSS animations for conditional DOM</td></tr>
              <tr><td><code>@observer(type, opts?)</code></td><td>Method</td><td>Auto-managed Resize/Intersection/Mutation observer — <loom-link to="/element/observer" style="color: var(--accent)">Observer</loom-link></td></tr>
            </tbody>
          </table>
        </doc-section>
        {/* ═══════════ Timing ═══════════ */}

        <doc-section heading="Timing">
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@interval(ms)</code></td><td>Method</td><td>Auto-cleaned setInterval — <loom-link to="/element/timing" style="color: var(--accent)">Timing</loom-link></td></tr>
              <tr><td><code>@timeout(ms)</code></td><td>Method</td><td>Auto-cleaned setTimeout — <loom-link to="/element/timing" style="color: var(--accent)">Timing</loom-link></td></tr>
              <tr><td><code>@debounce(ms)</code></td><td>Method</td><td>Debounced method calls — <loom-link to="/element/timing" style="color: var(--accent)">Timing</loom-link></td></tr>
              <tr><td><code>@throttle(ms)</code></td><td>Method</td><td>Throttled method calls — <loom-link to="/element/timing" style="color: var(--accent)">Timing</loom-link></td></tr>
              <tr><td><code>@animationFrame</code></td><td>Method</td><td>Auto-cleaned rAF loop — <loom-link to="/element/timing" style="color: var(--accent)">Timing</loom-link></td></tr>
            </tbody>
          </table>
        </doc-section>
        {/* ═══════════ Data Fetching ═══════════ */}

        <doc-section heading="Data Fetching">
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@api&lt;T&gt;(fn)</code></td><td>Accessor</td><td>Declarative async fetch — <loom-link to="/store/api" style="color: var(--accent)">Fetch</loom-link></td></tr>
              <tr><td><code>@intercept()</code></td><td>Method</td><td>Pre/post-fetch interceptors — <loom-link to="/store/api" style="color: var(--accent)">Fetch</loom-link></td></tr>
            </tbody>
          </table>
        </doc-section>
        {/* ═══════════ Misc ═══════════ */}

        <doc-section heading="Miscellaneous">
          <table class="api-table">
            <thead><tr><th>Decorator</th><th>Target</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>@transform(fn)</code></td><td>Accessor</td><td>Value transformation — <loom-link to="/decorators/transform" style="color: var(--accent)">Transform</loom-link></td></tr>
              <tr><td><code>@hotkey(combo)</code></td><td>Method</td><td>Keyboard shortcuts — <loom-link to="/decorators/hotkey" style="color: var(--accent)">Hotkey</loom-link></td></tr>
              <tr><td><code>@log(opts?)</code></td><td>Method</td><td>Structured logging — <loom-link to="/decorators/log" style="color: var(--accent)">Log</loom-link></td></tr>
              <tr><td><code>@context(Key)</code></td><td>Accessor</td><td>Cross-shadow-DOM data sharing — <loom-link to="/decorators/context" style="color: var(--accent)">Context</loom-link></td></tr>
              <tr><td><code>@portal(target)</code></td><td>Method</td><td>Teleport content — <loom-link to="/decorators/portal" style="color: var(--accent)">Portal</loom-link></td></tr>
              <tr><td><code>@media(query)</code></td><td>Accessor</td><td>Reactive media queries — <loom-link to="/decorators/media" style="color: var(--accent)">Media</loom-link></td></tr>
              <tr><td><code>@fullscreen()</code></td><td>Accessor</td><td>Toggle Fullscreen API — <loom-link to="/decorators/fullscreen" style="color: var(--accent)">Fullscreen</loom-link></td></tr>
              <tr><td><code>@clipboard(mode)</code></td><td>Method</td><td>Declarative copy/paste — <loom-link to="/decorators/clipboard" style="color: var(--accent)">Clipboard</loom-link></td></tr>
              <tr><td><code>@draggable(opts?)</code></td><td>Method</td><td>Make element draggable — <loom-link to="/decorators/dnd" style="color: var(--accent)">Drag & Drop</loom-link></td></tr>
              <tr><td><code>@dropzone(opts?)</code></td><td>Method</td><td>Accept dropped content — <loom-link to="/decorators/dnd" style="color: var(--accent)">Drag & Drop</loom-link></td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
