/**
 * Decorators — Permission  /decorators/permission
 *
 * Claims checked against src/element/permission.ts: the field holds its
 * declared value until the async query resolves, and both an absent
 * navigator.permissions and a rejected query() report "unsupported".
 */
import { LoomElement } from "@toyz/loom";

const QUICK = `import { permission, Permission, type LoomPermissionState } from "@toyz/loom/element";

@component("location-button")
class LocationButton extends LoomElement {
  @permission(Permission.Geolocation)
  accessor geo: LoomPermissionState = "prompt";

  update() {
    // Denied is a dead end: only site settings can undo it, so offering a
    // button that will always fail is worse than saying so.
    if (this.geo === "denied") {
      return <p>Location is blocked for this site. Change it in site settings.</p>;
    }
    // Unsupported means "cannot tell" — try it and handle the failure.
    return (
      <button onClick={() => this.locate()}>
        {this.geo === "prompt" ? "Use my location" : "Refresh location"}
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
            The first group is everything in TypeScript's own
            <span class="ic"> PermissionName</span> union. The second is implemented by engines
            but absent from it, which is the reason the parameter is not typed as
            <span class="ic">PermissionName</span> — doing so would reject
            <span class="ic">"clipboard-read"</span>, which browsers do support.
          </p>
          <table class="api-table">
            <thead><tr><th>Constant</th><th>Name</th><th>In lib.dom</th></tr></thead>
            <tbody>
              <tr><td><code>Permission.Camera</code></td><td><code>camera</code></td><td>yes</td></tr>
              <tr><td><code>Permission.Geolocation</code></td><td><code>geolocation</code></td><td>yes</td></tr>
              <tr><td><code>Permission.Microphone</code></td><td><code>microphone</code></td><td>yes</td></tr>
              <tr><td><code>Permission.Midi</code></td><td><code>midi</code></td><td>yes</td></tr>
              <tr><td><code>Permission.Notifications</code></td><td><code>notifications</code></td><td>yes</td></tr>
              <tr><td><code>Permission.PersistentStorage</code></td><td><code>persistent-storage</code></td><td>yes</td></tr>
              <tr><td><code>Permission.Push</code></td><td><code>push</code></td><td>yes</td></tr>
              <tr><td><code>Permission.ScreenWakeLock</code></td><td><code>screen-wake-lock</code></td><td>yes</td></tr>
              <tr><td><code>Permission.StorageAccess</code></td><td><code>storage-access</code></td><td>yes</td></tr>
              <tr><td><code>Permission.ClipboardRead</code></td><td><code>clipboard-read</code></td><td>no</td></tr>
              <tr><td><code>Permission.ClipboardWrite</code></td><td><code>clipboard-write</code></td><td>no</td></tr>
              <tr><td><code>Permission.Bluetooth</code></td><td><code>bluetooth</code></td><td>no</td></tr>
              <tr><td><code>Permission.DisplayCapture</code></td><td><code>display-capture</code></td><td>no</td></tr>
              <tr><td><code>Permission.IdleDetection</code></td><td><code>idle-detection</code></td><td>no</td></tr>
              <tr><td><code>Permission.LocalFonts</code></td><td><code>local-fonts</code></td><td>no</td></tr>
              <tr><td><code>Permission.WindowManagement</code></td><td><code>window-management</code></td><td>no</td></tr>
              <tr><td><code>Permission.Accelerometer</code></td><td><code>accelerometer</code></td><td>no</td></tr>
              <tr><td><code>Permission.Gyroscope</code></td><td><code>gyroscope</code></td><td>no</td></tr>
              <tr><td><code>Permission.Magnetometer</code></td><td><code>magnetometer</code></td><td>no</td></tr>
              <tr><td><code>Permission.AmbientLightSensor</code></td><td><code>ambient-light-sensor</code></td><td>no</td></tr>
              <tr><td><code>Permission.BackgroundSync</code></td><td><code>background-sync</code></td><td>no</td></tr>
              <tr><td><code>Permission.PeriodicBackgroundSync</code></td><td><code>periodic-background-sync</code></td><td>no</td></tr>
              <tr><td><code>Permission.PaymentHandler</code></td><td><code>payment-handler</code></td><td>no</td></tr>
              <tr><td><code>Permission.SpeakerSelection</code></td><td><code>speaker-selection</code></td><td>no</td></tr>
              <tr><td><code>Permission.Nfc</code></td><td><code>nfc</code></td><td>no</td></tr>
            </tbody>
          </table>
          <doc-notification type="note">
            Being in the list is not a promise that an engine implements it — support varies
            widely, and that is precisely what <span class="ic">"unsupported"</span> is for.
          </doc-notification>
        </doc-section>

        <doc-section heading="unsupported is not denied">
          <p>
            Two browsers can fail to answer for different reasons, and the two call for
            different UI. <span class="ic">navigator.permissions</span> is missing entirely in
            some engines, and <span class="ic">query()</span> rejects with a
            <span class="ic"> TypeError</span> for names a given engine does not implement —
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
            three conversations you are about to have — and the useful one is
            <span class="ic"> "prompt"</span>, where explaining why you are asking, before the
            browser asks, is the difference between a granted permission and a dismissed one.
          </p>
        </doc-section>

        <doc-nav></doc-nav>
      </div>
    );
  }
}
