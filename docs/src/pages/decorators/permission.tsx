/**
 * Decorators — Permission  /decorators/permission
 *
 * Claims checked against src/element/permission.ts: the field holds its
 * declared value until the async query resolves, and both an absent
 * navigator.permissions and a rejected query() report "unsupported".
 */
import { LoomElement } from "@toyz/loom";

const QUICK = `import {
  permission, Permission, PermissionState,
  isBlocked, willPrompt,
  type LoomPermissionState,
} from "@toyz/loom/element";

@component("location-button")
class LocationButton extends LoomElement {
  @permission(Permission.Geolocation)
  accessor geo: LoomPermissionState = PermissionState.Prompt;

  update() {
    // A dead end: only site settings can undo it, so a button that will
    // always fail is worse than saying so.
    if (isBlocked(this.geo)) {
      return <p>Location is blocked for this site. Change it in site settings.</p>;
    }
    return (
      <button onClick={() => this.locate()}>
        {willPrompt(this.geo) ? "Use my location" : "Refresh location"}
      </button>
    );
  }
}`;

const NAMES_EXAMPLE = `import { permission, Permission } from "@toyz/loom/element";

// Typed: autocompletes, and cannot be misspelt
@permission(Permission.ClipboardRead)
accessor clip: LoomPermissionState = "prompt";

// Raw string: for anything newer than the registry
@permission("compute-pressure")
accessor cpu: LoomPermissionState = "prompt";`;

const PREDICATE_EXAMPLE = `import { PermissionState, isBlocked, canAttempt } from "@toyz/loom/element";

// Either style, no literals
if (this.geo === PermissionState.Denied) { /* ... */ }
if (isBlocked(this.geo))                  { /* ... */ }

// Includes "unsupported": the browser would not say in advance,
// which is not the same as refusing
if (canAttempt(this.geo)) {
  this.locate();
}`;

export default class PageDecoratorPermission extends LoomElement {
  update() {
    return (
      <div>
        <doc-header
          title="@permission"
          subtitle="The state of a browser permission, before you trigger the thing that needs it."
        ></doc-header>

        <section>
          <p>Asking for a permission you already know is denied wastes the ask: the prompt never appears, the API rejects, and the user is left with a control that silently does nothing. There is no way to re-request from script either — a denied permission can only be undone in site settings.</p>
          <p><span class="ic">@permission</span> binds a field to the Permissions API so a component can answer that question before it acts. It resolves on connect, re-renders when the state changes, and unsubscribes on disconnect.</p>
          <punch-matrix
            columns="CAN PROCEED,WILL PROMPT,RECOVERABLE IN PAGE"
            rows={[
              { name: "granted", punches: "CAN PROCEED", note: "Go ahead, no interruption" },
              { name: "prompt", punches: "CAN PROCEED,WILL PROMPT,RECOVERABLE IN PAGE", note: "Explain why before you ask" },
              { name: "denied", punches: "", note: "Only site settings can undo it" },
              { name: "unsupported", punches: "CAN PROCEED", note: "Cannot tell — try it, handle the failure" },
            ]}
          ></punch-matrix>
        </section>

        <doc-section heading="Quick start">
          <api-entry sig="@permission(name)">
            <p>
              Binds an accessor to <span class="ic">navigator.permissions.query()</span>. The
              query is asynchronous, so the field holds whatever you declared until the first
              answer arrives — declare it <span class="ic">"prompt"</span> unless you have a
              reason not to.
            </p>
            <code-block lang="tsx" code={QUICK}></code-block>
          </api-entry>
        </doc-section>

        <doc-section heading="Names">
          <p>
            <span class="ic">Permission</span> holds the known names so a call site does not
            depend on remembering a string. It is for discovery and spelling, not a gate — a
            raw string still works, which matters because the registry cannot keep up with
            every engine:
          </p>
          <code-block lang="ts" code={NAMES_EXAMPLE}></code-block>
          <p>
            The first group is everything in TypeScript's own{" "}
            <span class="ic">PermissionName</span> union. The second is implemented by engines
            but absent from it, which is the reason the parameter is not typed as{" "}
            <span class="ic">PermissionName</span> — doing so would reject{" "}
            <span class="ic">"clipboard-read"</span>, which browsers do support.
          </p>
          <api-table
            head={["Constant", "Name", "In lib.dom"]}
            rows={[
              [<code>Permission.Camera</code>, <code>camera</code>, "yes"],
              [<code>Permission.Geolocation</code>, <code>geolocation</code>, "yes"],
              [<code>Permission.Microphone</code>, <code>microphone</code>, "yes"],
              [<code>Permission.Midi</code>, <code>midi</code>, "yes"],
              [<code>Permission.Notifications</code>, <code>notifications</code>, "yes"],
              [<code>Permission.PersistentStorage</code>, <code>persistent-storage</code>, "yes"],
              [<code>Permission.Push</code>, <code>push</code>, "yes"],
              [<code>Permission.ScreenWakeLock</code>, <code>screen-wake-lock</code>, "yes"],
              [<code>Permission.StorageAccess</code>, <code>storage-access</code>, "yes"],
              [<code>Permission.ClipboardRead</code>, <code>clipboard-read</code>, "no"],
              [<code>Permission.ClipboardWrite</code>, <code>clipboard-write</code>, "no"],
              [<code>Permission.Bluetooth</code>, <code>bluetooth</code>, "no"],
              [<code>Permission.DisplayCapture</code>, <code>display-capture</code>, "no"],
              [<code>Permission.IdleDetection</code>, <code>idle-detection</code>, "no"],
              [<code>Permission.LocalFonts</code>, <code>local-fonts</code>, "no"],
              [<code>Permission.WindowManagement</code>, <code>window-management</code>, "no"],
              [<code>Permission.Accelerometer</code>, <code>accelerometer</code>, "no"],
              [<code>Permission.Gyroscope</code>, <code>gyroscope</code>, "no"],
              [<code>Permission.Magnetometer</code>, <code>magnetometer</code>, "no"],
              [<code>Permission.AmbientLightSensor</code>, <code>ambient-light-sensor</code>, "no"],
              [<code>Permission.BackgroundSync</code>, <code>background-sync</code>, "no"],
              [<code>Permission.PeriodicBackgroundSync</code>, <code>periodic-background-sync</code>, "no"],
              [<code>Permission.PaymentHandler</code>, <code>payment-handler</code>, "no"],
              [<code>Permission.SpeakerSelection</code>, <code>speaker-selection</code>, "no"],
              [<code>Permission.Nfc</code>, <code>nfc</code>, "no"],
            ]}
          ></api-table>
          <doc-notification type="note">
            Being in the list is not a promise that an engine implements it — support varies
            widely, and that is precisely what <span class="ic">"unsupported"</span> is for.
          </doc-notification>
        </doc-section>

        <doc-section heading="Comparing without literals">
          <p>
            <span class="ic">PermissionState</span> holds the four values, so a comparison does
            not depend on a string literal any more than the name does.
          </p>
          <p>
            The predicates go further and encode the rules rather than leaving them to be
            re-derived at each call site. <span class="ic">canAttempt</span> is the one worth
            reaching for: it includes <span class="ic">"unsupported"</span>, because a browser
            declining to answer in advance is not a browser saying no — and treating it as no
            is how a feature ends up disabled on engines where it would have worked.
          </p>
          <code-block lang="ts" code={PREDICATE_EXAMPLE}></code-block>
          <table class="api-table">
            <thead><tr><th>Helper</th><th>True for</th><th>Use it to</th></tr></thead>
            <tbody>
              <tr><td><code>isGranted(s)</code></td><td><code>granted</code></td><td>Proceed with no interruption</td></tr>
              <tr><td><code>willPrompt(s)</code></td><td><code>prompt</code></td><td>Explain before the browser asks</td></tr>
              <tr><td><code>isBlocked(s)</code></td><td><code>denied</code></td><td>Stop, and point at site settings</td></tr>
              <tr><td><code>canAttempt(s)</code></td><td>everything except <code>denied</code></td><td>Decide whether to offer the control at all</td></tr>
            </tbody>
          </table>
        </doc-section>

        <doc-section heading="unsupported is not denied">
          <p>
            Two browsers can fail to answer for different reasons, and the two call for
            different UI. <span class="ic">navigator.permissions</span> is missing entirely in
            some engines, and <span class="ic">query()</span> rejects with a{" "}
            <span class="ic">TypeError</span> for names a given engine does not implement —
            <span class="ic">"camera"</span> in Firefox, for one.
          </p>
          <p>
            Both are reported as <span class="ic">"unsupported"</span> rather than collapsed
            into <span class="ic">"denied"</span>. Denied means stop. Unsupported means the
            browser will not tell you in advance, so attempt the operation and handle the
            failure.
          </p>
        </doc-section>

        <doc-section heading="What it does not do">
          <p class="caution">
            Querying never grants anything and never suppresses a prompt. It tells you which of
            three conversations you are about to have — and the useful one is{" "}
            <span class="ic">"prompt"</span>, where explaining why you are asking, before the
            browser asks, is the difference between a granted permission and a dismissed one.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}
