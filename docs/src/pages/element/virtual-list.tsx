/**
 * Virtual List — /element/virtual-list
 */
import { LoomElement } from "@toyz/loom";

export default class PageVirtualList extends LoomElement {
  update() {
    return (
      <div>
        <doc-header title="Virtual List" subtitle="Render the rows in the viewport and none of the others. Heights are measured, not assumed."></doc-header>

        <section>
          <p>Ten thousand rows is ten thousand elements, ten thousand style resolutions and a layout pass over all of them. The browser is not slow at this because your framework is inefficient; it is slow because you asked it to lay out ten thousand things the user cannot see.</p>
          <p>Windowing renders only the rows that intersect the viewport plus a small overscan, and translates them into position so the scrollbar still reflects the full list. <span class="ic">loom-virtual</span> measures row heights as they render, so rows do not have to be uniform, and keeps those measurements across appends instead of discarding them.</p>
        </section>

        <doc-section heading="Overview">
            <p>
              <span class="ic">&lt;loom-virtual&gt;</span> renders only the visible items in a scrollable container.
              Items are measured, cached, and recycled — you get smooth scrolling even with 100k+ rows.
            </p>
          <doc-notification type="note">
            <span class="ic">LoomVirtual</span> is a built-in element that ships with Loom. Import it explicitly
            to register the custom element (it's excluded from the main barrel to avoid side effects):
          </doc-notification>
          <code-block lang="ts" code={`import "@toyz/loom/element/virtual";`}></code-block>
        </doc-section>
        <doc-section heading="Basic Usage">
            <p>
              Pass your data via <span class="ic">items</span> and provide a render template as a function child:
            </p>
            <code-block lang="tsx" code={`import "@toyz/loom/element/virtual";

// In your component's update():
<loom-virtual items={this.messages} estimatedHeight={44}>
  {(msg: Message) => (
    <div class="msg">{msg.text}</div>
  )}
</loom-virtual>`}></code-block>
        </doc-section>
        <doc-section heading="Styling">
            <p>
              <span class="ic">&lt;loom-virtual&gt;</span> uses Shadow DOM internally. The host element must have{" "}
              <span class="ic">display: block</span> and a <strong>fixed height</strong> — without a constrained
              height, there's nothing to virtualize against.
            </p>
            <code-block lang="css" code={`/* In the consumer's styles */
loom-virtual {
  display: block;
  height: 400px;        /* or any fixed/max height */
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;     /* clip host — inner viewport scrolls */
}`}></code-block>
          <doc-notification type="note">
            The internal structure is <span class="ic">.vl-viewport → .vl-spacer → .vl-window</span>.
            The viewport scrolls, the spacer sets the total height, and the window is absolutely positioned
            to render only visible items.
          </doc-notification>
        </doc-section>
        <doc-section heading="Props">
          <api-table
            head={["Prop", "Type", "Default", "Description"]}
            rows={[
              [<code>items</code>, <code>T[]</code>, <code>[]</code>, "Array of items to virtualize. Assigning a new array triggers re-render."],
              [<code>estimatedHeight</code>, <code>number</code>, <code>40</code>, "Initial height estimate per row in px. Auto-refined after measurement."],
              [<code>overscan</code>, <code>number</code>, <code>3</code>, "Extra items rendered above/below the visible window."],
              [<code>pinToBottom</code>, <code>boolean</code>, <code>true</code>, "Auto-scroll to bottom when items are appended. Great for chat UIs."],
              [<code>onNearEnd</code>, <code>() =&gt; void</code>, <code>null</code>, "Callback fired when scrolled within 100px of the bottom — use for infinite scroll / pagination."],
            ]}
          ></api-table>
        </doc-section>
        <doc-section heading="Imperative Methods">
          <api-table
            head={["Method", "Description"]}
            rows={[
              [<code>push(...items)</code>, "Append items. Auto-scrolls if user is near the bottom."],
              [<code>scrollToEnd()</code>, "Scroll to the very bottom immediately."],
              [<code>refresh()</code>, "Re-measure all visible items and rebuild offsets."],
            ]}
          ></api-table>
        </doc-section>
        <doc-section heading="Children Template">
            <p>
              The function child is the render template. It receives each item and its index,
              and returns a DOM node. JSX works perfectly — you can even use other Loom components:
            </p>
            <code-block lang="tsx" code={`<loom-virtual items={this.people} estimatedHeight={38}>
  {(person: Person, index: number) => (
    <person-row pid={person.id} name={person.name} role={person.role}>
    </person-row>
  )}
</loom-virtual>`}></code-block>
        </doc-section>
        <doc-section heading="Infinite Scroll">
            <p>Use the <span class="ic">onNearEnd</span> callback for pagination:</p>
            <code-block lang="tsx" code={`<loom-virtual
  items={this.messages}
  estimatedHeight={44}
  onNearEnd={() => this.loadMore()}
>
  {(msg: Message) => <div class="msg">{msg.text}</div>}
</loom-virtual>`}></code-block>
        </doc-section>
        <doc-section heading="Dynamic Item Counts">
            <p>
              Changing the <span class="ic">items</span> array (by reference) automatically clears
              the height cache, rebuilds offsets, and re-renders the visible window. This works seamlessly
              with reactive state:
            </p>
            <code-block lang="tsx" code={`@reactive accessor data: Person[] = generate(10_000);

setCount(n: number) {
  this.data = generate(n); // new array → triggers invalidation
}

// In update():
<loom-virtual items={this.data} estimatedHeight={38}>
  {(p: Person) => <div>{p.name}</div>}
</loom-virtual>`}></code-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
