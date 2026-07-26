/**
 * Element — Observer  /element/observer
 *
 * @observer decorator for auto-managed DOM observers.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementObserver extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Observer" subtitle="Resize, intersection and mutation observers that disconnect themselves."></doc-header>

        <section>
          <p>The three DOM observers all share the same failure mode: they hold a strong reference to their callback, and their callback closes over your element. Forget one <span class="ic">disconnect()</span> and the element is never collected — it keeps receiving entries, keeps writing to a detached tree, and keeps the whole component graph alive.</p>
          <p><span class="ic">@observer</span> creates the observer on connect and disconnects it on disconnect, in the same declaration. The three kinds differ in what they watch: <span class="ic">resize</span> for box size, <span class="ic">intersection</span> for viewport overlap, <span class="ic">mutation</span> for subtree changes. Loom hands your method one entry at a time rather than the raw array.</p>
          <punch-matrix
            columns="BOX SIZE,VIEWPORT,SUBTREE,FIRES ON OBSERVE"
            rows={[
              { name: "resize", punches: "BOX SIZE,FIRES ON OBSERVE", note: "Content box and border box" },
              { name: "intersection", punches: "VIEWPORT,FIRES ON OBSERVE", note: "Overlap with a root, by ratio" },
              { name: "mutation", punches: "SUBTREE", note: "Children, attributes, character data" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="Overview">
            <p>
              The <span class="ic">@observer</span> decorator binds a method to a native DOM observer.
              Loom creates the observer on <span class="ic">connectedCallback</span>, observes the element (or a custom target),
              and disconnects automatically on <span class="ic">disconnectedCallback</span>. No manual lifecycle management needed.
            </p>
            <p>
              Three observer types are supported:
            </p>
          <api-table
            head={["Type", "Native API", "Use Case"]}
            rows={[
              [<code>"resize"</code>, <code>ResizeObserver</code>, "React to element size changes"],
              [<code>"intersection"</code>, <code>IntersectionObserver</code>, "Detect visibility in viewport"],
              [<code>"mutation"</code>, <code>MutationObserver</code>, "Watch child/attribute/text changes"],
            ]}
          ></api-table>
        </doc-section>
        <doc-section heading="ResizeObserver">
          <api-entry sig={`@observer("resize", opts?)`}>
            <p>
              Fires the decorated method whenever the element's size changes. Each call receives a single <code>ResizeObserverEntry</code> — Loom iterates the entries array for you.
            </p>
            <code-block lang="ts" code={`import { LoomElement, component } from "@toyz/loom";
import { observer } from "@toyz/loom/element";

@component("responsive-card")
class ResponsiveCard extends LoomElement {
  layout: "compact" | "full" = "full";

  @observer("resize")
  onResize(entry: ResizeObserverEntry) {
    const { width } = entry.contentRect;
    this.layout = width < 400 ? "compact" : "full";
    this.scheduleUpdate();
  }

  update() {
    return <div class={this.layout}>...</div>;
  }
}`}></code-block>
          </api-entry>
            <p>
              Pass <code>ResizeObserverOptions</code> as the second argument to control which box model to observe:
            </p>
            <code-block lang="ts" code={`@observer("resize", { box: "border-box" })
onResize(entry: ResizeObserverEntry) {
  // entry.borderBoxSize is now populated
}`}></code-block>
        </doc-section>
        <doc-section heading="IntersectionObserver">
          <api-entry sig={`@observer("intersection", opts?)`}>
            <p>
              Fires the decorated method when the element enters or exits the viewport (or a custom root).
              Each call receives a single <code>IntersectionObserverEntry</code>.
            </p>
            <code-block lang="ts" code={`import { LoomElement, component } from "@toyz/loom";
import { observer } from "@toyz/loom/element";

@component("lazy-image")
class LazyImage extends LoomElement {
  src = "";
  loaded = false;

  @observer("intersection", { threshold: 0.1, rootMargin: "200px" })
  onVisible(entry: IntersectionObserverEntry) {
    if (entry.isIntersecting && !this.loaded) {
      this.loaded = true;
      this.scheduleUpdate();
    }
  }

  update() {
    return this.loaded
      ? <img src={this.src} />
      : <div class="placeholder" />;
  }
}`}></code-block>
          </api-entry>
          <doc-notification type="tip">
            Use <code>rootMargin</code> to start loading elements <strong>before</strong> they
            enter the viewport — great for preloading images and heavy content.
          </doc-notification>
        </doc-section>
        <doc-section heading="MutationObserver">
          <api-entry sig={`@observer("mutation", opts)`}>
            <p>
              Fires the decorated method when child nodes, attributes, or character data change.
              Each call receives a single <code>MutationRecord</code>.
              The <span class="ic">options</span> argument is <strong>required</strong> for mutation observers
              — you must specify at least one of <code>childList</code>, <code>attributes</code>, or <code>characterData</code>.
            </p>
            <code-block lang="ts" code={`import { LoomElement, component } from "@toyz/loom";
import { observer } from "@toyz/loom/element";

@component("slot-counter")
class SlotCounter extends LoomElement {
  count = 0;

  @observer("mutation", { childList: true, subtree: true })
  onChildChange(record: MutationRecord) {
    this.count = this.childNodes.length;
    this.scheduleUpdate();
  }

  update() {
    return (
      <div>
        <span>{this.count} children</span>
        <slot></slot>
      </div>
    );
  }
}`}></code-block>
          </api-entry>
        </doc-section>
        <doc-section heading="Custom Target">
            <p>
              By default, <span class="ic">@observer</span> observes <code>this</code> — the component element itself.
              Pass a <strong>target resolver</strong> as the third argument to observe a different node, such as
              a parent, the document, or a node inside the shadow DOM.
            </p>
            <code-block lang="ts" code={`import { LoomElement, component } from "@toyz/loom";
import { observer } from "@toyz/loom/element";

@component("parent-watcher")
class ParentWatcher extends LoomElement {
  // Observe attributes on the host's parent element
  @observer("mutation", { attributes: true }, el => el.parentElement)
  onParentAttrChange(record: MutationRecord) {
    console.log(\`Parent attr changed: \${record.attributeName}\`);
  }

  // Observe resize on a specific child element
  @observer("resize", undefined, el => el.shadowRoot!.querySelector(".canvas"))
  onCanvasResize(entry: ResizeObserverEntry) {
    const { width, height } = entry.contentRect;
    this.resizeCanvas(width, height);
  }
}`}></code-block>
          <doc-notification type="note">
            If the target resolver returns <code>null</code> or <code>undefined</code>, the observer
            is silently skipped. This is safe — no error is thrown.
          </doc-notification>
        </doc-section>
        <doc-section heading="Multiple Observers">
            <p>
              A single component can have any number of <span class="ic">@observer</span> decorators.
              Each creates its own independent observer. All are cleaned up together on disconnect.
            </p>
            <code-block lang="ts" code={`@component("smart-panel")
class SmartPanel extends LoomElement {
  @observer("resize")
  onResize(entry: ResizeObserverEntry) {
    // Adapt layout to size
  }

  @observer("intersection", { threshold: 0 })
  onVisibility(entry: IntersectionObserverEntry) {
    // Pause/resume animations
  }

  @observer("mutation", { childList: true })
  onChildrenChanged(record: MutationRecord) {
    // Re-count or re-render
  }
}`}></code-block>
        </doc-section>
        <doc-section heading="Lifecycle">
            <p>
              Observers follow the element's lifecycle automatically:
            </p>
          <table class="api-table">
            <thead><tr><th>Element Event</th><th>Observer Action</th></tr></thead>
            <tbody>
              <tr><td><code>connectedCallback</code></td><td>Observer created, <code>.observe(target)</code> called</td></tr>
              <tr><td><code>disconnectedCallback</code></td><td><code>.disconnect()</code> called — stops all observation</td></tr>
              <tr><td>Reconnect (re-appended)</td><td>A <strong>new</strong> observer is created, observation resumes</td></tr>
            </tbody>
          </table>
          <doc-notification type="note">
            Reconnecting an element creates a fresh observer instance. This ensures
            the element always has a clean observer state.
          </doc-notification>
        </doc-section>
        <doc-section heading="API Reference">
          <api-entry sig="@observer(type, options?, target?)">

          </api-entry>
          <table class="api-table">
            <thead><tr><th>Argument</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>type</code></td><td><code>"resize" | "intersection" | "mutation"</code></td><td>Which native observer API to use</td></tr>
              <tr><td><code>options</code></td><td><code>ResizeObserverOptions | IntersectionObserverInit | MutationObserverInit</code></td><td>Passed directly to the native observer. Required for <code>"mutation"</code>.</td></tr>
              <tr><td><code>target</code></td><td><code>(el: HTMLElement) =&gt; Node | null</code></td><td>Optional resolver to observe a different node instead of <code>this</code>. Skips silently if <code>null</code>.</td></tr>
            </tbody>
          </table>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
