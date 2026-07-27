/**
 * Decorators — Device APIs  /decorators/device
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorDevice extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="Device APIs"
          subtitle="Geolocation, wake lock and sharing — each of which hands you something to release."
        ></doc-header>

        <section>
          <p>Three small platform APIs with one problem in common: each returns something that has to be released, and none of them is released by the page going away. A <span class="ic">watchPosition</span> keeps the GPS on, a wake lock keeps the screen awake, and both outlive the component that started them.</p>
          <p><loom-link to="/decorators/permission" style="color: var(--accent)">@permission</loom-link> answers whether these are allowed. This is what to do once they are.</p>
        </section>

        <doc-section heading="@geolocation">
          <code-block lang="ts" code={GEO}></code-block>
          <p class="caution">
            <span class="ic">watchPosition</span> returns an id that has to reach{" "}
            <span class="ic">clearWatch</span>. Nothing does that for you, so a component that
            starts a high-accuracy watch and navigates away leaves the GPS running — on a phone,
            a battery cost with nothing on screen to explain it.
          </p>
          <p>Takes the standard <span class="ic">PositionOptions</span>, plus <span class="ic">onError</span>.</p>
        </doc-section>

        <doc-section heading="@wakeLock">
          <code-block lang="ts" code={WAKE}></code-block>
          <p class="note">
            The browser drops the lock whenever the page is hidden and will not restore it, so
            it is re-acquired on return. Without that, a wake lock survives exactly one tab
            switch — which looks like the feature working right up until someone checks their
            phone mid-recipe.
          </p>
        </doc-section>

        <doc-section heading="share()">
          <code-block lang="ts" code={SHARE}></code-block>
          <api-table
            head={["Returns", "When"]}
            rows={[
              [<code>true</code>, "The sheet was shown and the user shared"],
              [<code>false</code>, "The user dismissed the sheet, or sharing is unavailable"],
              ["throws", "A real failure — a permission problem or a malformed payload"],
            ]}
          ></api-table>
          <p class="note">
            A dismissed sheet rejects with <span class="ic">AbortError</span>. That is a normal
            outcome, not a failure, so it comes back as <span class="ic">false</span> rather than
            an exception you have to filter. Check <span class="ic">canShare(data)</span> first
            to decide whether to show the button at all.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}

const GEO = `import { component, geolocation, reactive } from "@toyz/loom";

@component("near-me")
class NearMe extends LoomElement {
  @reactive accessor coords: GeolocationCoordinates | null = null;

  @geolocation({ enableHighAccuracy: true, maximumAge: 10_000 })
  onMove(pos: GeolocationPosition) {
    this.coords = pos.coords;
  }
}`;

const WAKE = `import { component, wakeLock } from "@toyz/loom";

@component("recipe-steps")
@wakeLock
class RecipeSteps extends LoomElement { }`;

const SHARE = `import { share, canShare } from "@toyz/loom";

if (canShare({ url: location.href })) {
  const shared = await share({
    title: "Loom",
    text: "A web components framework",
    url: location.href,
  });
}`;
