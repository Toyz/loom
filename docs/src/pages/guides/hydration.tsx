/**
 * Guides — Hydration  /guides/hydration
 *
 * Documentation for Declarative Shadow DOM (DSD) hydration.
 */
import { LoomElement } from "@toyz/loom";

export default class PageGuidesHydration extends LoomElement {
    update() {
        return (
            <div>
                <doc-header title="Hydration" subtitle="Instant FCP with Declarative Shadow DOM — zero extra dependencies."></doc-header>

        <section>
          <p>A client-rendered component shows nothing until its JavaScript has downloaded, parsed and run. Server-rendering the markup fixes the blank screen and introduces the harder problem: the shadow root does not exist in HTML, so there has been nothing to server-render into.</p>
          <p>Declarative Shadow DOM closes that gap. The server emits the shadow content as markup, the browser attaches it before any script runs, and Loom adopts the existing tree instead of rebuilding it. First paint does not wait for the bundle, and there is no framework runtime involved in getting it on screen.</p>
        </section>

                <section>
                    <div class="group-header">
                        <h2>Overview</h2>
                    </div>
                        <p>
                            Loom supports <strong>Declarative Shadow DOM (DSD)</strong> hydration out of the box.
                            Write a <span class="ic">{"<template shadowrootmode=\"open\">"}</span> in your HTML and
                            the browser paints the shadow DOM <em>before any JavaScript loads</em>. When Loom's JS
                            arrives, it <strong>hydrates</strong> the existing shadow root — wiring up event listeners,
                            reactive bindings, and the trace engine — without destroying or re-rendering the pre-painted content.
                        </p>
                        <div class="dec-desc" style={{ marginTop: "0.75rem" }}>
                            This is entirely internal to <span class="ic">@toyz/loom</span> — no extra packages to install,
                            no SSG framework, and no build plugins.
                        </div>
                </section>

                <section>
                    <div class="group-header">
                        <h2>Basic Usage</h2>
                    </div>
                        <p>
                            Add a <span class="ic">{"<template shadowrootmode=\"open\">"}</span> inside your custom element
                            in the HTML. The browser instantly creates a shadow root with the template content — no JS needed.
                        </p>
                        <code-block lang="html" code={`<!-- index.html — pre-rendered shell -->
<my-counter>
  <template shadowrootmode="open">
    <style>
      :host { display: block; font-family: sans-serif; }
      .count { font-size: 2rem; color: var(--accent); }
    </style>
    <p class="count">0</p>
    <button>Increment</button>
  </template>
</my-counter>`}></code-block>

                        <p>
                            Your Loom component doesn't change at all. When it mounts, Loom detects the existing
                            shadow root and <strong>morphs</strong> against it instead of rendering from scratch:
                        </p>
                        <code-block lang="ts" code={`@component("my-counter")
class MyCounter extends LoomElement {
  @reactive accessor count = 0;

  update() {
    return (
      <>
        <p class="count">{this.count}</p>
        <button onClick={() => this.count++}>Increment</button>
      </>
    );
  }
}`}></code-block>
                </section>

                <section>
                    <div class="group-header">
                        <h2>How It Works</h2>
                    </div>
                        <p>
                            Three things happen under the hood:
                        </p>
                    <table class="api-table">
                        <thead>
                            <tr><th>Phase</th><th>What Happens</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>1. Browser Parse</strong></td>
                                <td>
                                    The browser sees <code>{"<template shadowrootmode=\"open\">"}</code> and creates a shadow root
                                    with the template content. The user sees the pre-rendered UI immediately — <strong>zero JS required</strong>.
                                </td>
                            </tr>
                            <tr>
                                <td><strong>2. Constructor</strong></td>
                                <td>
                                    When <code>customElements.define()</code> upgrades the element, LoomElement's constructor detects
                                    the existing <code>this.shadowRoot</code> and reuses it instead of calling <code>attachShadow()</code>.
                                </td>
                            </tr>
                            <tr>
                                <td><strong>3. Hydration</strong></td>
                                <td>
                                    On <code>connectedCallback</code>, Loom calls <code>update()</code> and <strong>morphs</strong> the
                                    result against the existing shadow DOM. Since the HTML matches, the morph is a no-op — but event
                                    listeners and reactive bindings get wired up.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </section>

                <section>
                    <div class="group-header">
                        <h2>When to Use</h2>
                    </div>
                    <div class="grid">
                        <div class="card">
                            <h3><loom-icon name="check" size={16} color="var(--text-muted)"></loom-icon> Great For</h3>
                            <ul>
                                <li>App shells, nav bars, and hero sections</li>
                                <li>Above-the-fold content that must paint instantly</li>
                                <li>Static or server-rendered pages using web components</li>
                                <li>Progressive enhancement — works before JS loads</li>
                            </ul>
                        </div>
                        <div class="card">
                            <h3><loom-icon name="x" size={16} color="var(--text-muted)"></loom-icon> Not Needed For</h3>
                            <ul>
                                <li>Below-the-fold components (lazy load instead)</li>
                                <li>Highly dynamic content that changes on every load</li>
                                <li>Components only shown after user interaction</li>
                                <li>Internal/admin dashboards where FCP isn't critical</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section>
                    <div class="group-header">
                        <h2>Browser Support</h2>
                    </div>
                        <p>
                            Declarative Shadow DOM is supported in all modern browsers: <strong>Chrome 111+</strong>, <strong>Firefox 123+</strong>, <strong>Safari 16.4+</strong>, and <strong>Edge 111+</strong>.
                            In older browsers without DSD support, the <code>{"<template>"}</code> is ignored and Loom
                            falls back to normal client-side rendering — no breakage, just no pre-paint benefit.
                        </p>
                </section>

                <doc-nav></doc-nav>
            </div>
        );
    }
}
