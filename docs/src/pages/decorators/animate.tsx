/**
 * Decorators — Animate  /decorators/animate
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorAnimate extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Animate"
          subtitle="Web Animations, cancelled when the component goes away."
        ></doc-header>

        <section>
          <p><span class="ic">element.animate()</span> returns an <span class="ic">Animation</span> that keeps running after the element is detached. A component that starts one per connect and never cancels leaks a live animation on every mount — the keyframes are the platform's, the bookkeeping is what this does.</p>
        </section>

        <doc-section heading="@animate">
          <code-block lang="tsx" code={BASIC}></code-block>
          <p>
            The decorated member becomes a function returning the running{" "}
            <span class="ic">Animation</span>, so it can be paused, reversed or awaited.
            Pass <span class="ic">{`{ auto: false }`}</span> to start it only when called.
          </p>
          <code-block lang="ts" code={CONTROL}></code-block>
        </doc-section>

        <doc-section heading="Timing">
          <p class="note">
            The animation starts after the first render, not on connect — the target does not
            exist until the component has rendered. It is re-checked on later renders, so an
            element replaced by a morph is picked up rather than leaving the animation running
            on a node no longer in the tree.
          </p>
        </doc-section>

        <doc-section heading="Imperative use">
          <code-block lang="ts" code={IMPERATIVE}></code-block>
          <p class="note">
            Returns a no-op teardown where the Web Animations API is missing, so callers never
            branch on support. <span class="ic">supportsAnimations()</span> reports it if you
            need to.
          </p>
        </doc-section>

        <doc-section heading="When CSS is the better answer">
          <p>
            A transition that runs once on a state change belongs in CSS, and{" "}
            <loom-link to="/decorators/transition" style="color: var(--accent)"> @transition</loom-link> covers
            enter and leave animations on conditional DOM. Reach for{" "}
            <span class="ic">@animate</span> when the keyframes are computed, when the
            animation needs to be paused or reversed from code, or when you need to await its
            completion.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}

const BASIC = `import { component, animate } from "@toyz/loom";

@component("pulse-dot")
class PulseDot extends LoomElement {
  @animate(".dot",
    [{ opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }],
    { duration: 1500, iterations: Infinity })
  pulse!: () => Animation | null;

  update() { return <span class="dot" />; }
}`;

const CONTROL = `const animation = this.pulse();   // restarts it
animation?.pause();
animation?.reverse();
await animation?.finished;`;

const IMPERATIVE = `import { animateElement } from "@toyz/loom";

const { animation, cancel } = animateElement(
  el,
  [{ transform: "translateY(8px)", opacity: 0 }, { transform: "none", opacity: 1 }],
  { duration: 200, easing: "ease-out" },
);

this.track(cancel);   // cancelled with the component`;
