/**
 * Docs — @hotkey decorator
 *
 * Reference page for @hotkey — declarative keyboard shortcuts.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementHotkey extends LoomElement {
    update() {
        return (
            <div>
                <doc-header title="@hotkey" subtitle="Declarative keyboard shortcuts with auto-cleanup on disconnect."></doc-header>

        <section>
          <p>A keyboard shortcut is usually registered on <span class="ic">document</span>, because that is the only place it can be caught reliably. Which means the listener outlives the component that wanted it, keeps firing after the component is gone, and now needs a teardown written somewhere far from the code that reads it.</p>
          <p><span class="ic">@hotkey</span> binds the shortcut for exactly as long as the element is connected. The binding and its removal are the same declaration, so a component that is never unmounted correctly is not a class of bug that exists here.</p>
        </section>

                <doc-section heading="Quick Start">
                    <code-block lang="ts" code={QUICK_START}></code-block>
                </doc-section>
                <doc-section heading="API">
                    <api-entry sig="@hotkey(...combos, options?)">
                        <p>
                            Binds a method to one or more keyboard shortcuts. Combos can be
                            strings (<span class="ic">"mod+k"</span>) or objects
                            (<span class="ic">{"{ key, mod, ctrl, ... }"}</span>). Mix freely.
                            Listeners are auto-cleaned on disconnect.
                        </p>
                    </api-entry>
                        <p>
                            <strong>Options:</strong>
                        </p>
                        <table class="api-table">
                            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                            <tbody>
                                <tr><td><code>global</code></td><td>boolean</td><td>false</td><td>Listen on <code>document</code> instead of the element</td></tr>
                                <tr><td><code>preventDefault</code></td><td>boolean</td><td>true</td><td>Call <code>e.preventDefault()</code> on match</td></tr>
                            </tbody>
                        </table>
                </doc-section>
                <doc-section heading="Key Combos">
                        <p>
                            Combos use <span class="ic">+</span> to join modifiers and a key.
                            Case-insensitive. Supported modifiers:
                        </p>
                        <api-table
                          head={["Modifier", "Aliases", "Meaning"]}
                          rows={[
                            [<code>ctrl</code>, "control", "Control key"],
                            [<code>shift</code>, "—", "Shift key"],
                            [<code>alt</code>, "option", "Alt / Option key"],
                            [<code>meta</code>, "cmd, command, win", "Meta / Command / Windows key"],
                            [<code>mod</code>, "—", "⌘ on Mac, Ctrl elsewhere"],
                          ]}
                        ></api-table>
                        <doc-notification type="note">
                            Use <span class="ic">mod</span> for cross-platform shortcuts — it maps to <span class="ic">⌘ Cmd</span> on macOS and <span class="ic">Ctrl</span> everywhere else.
                        </doc-notification>
                </doc-section>
                <doc-section heading="Object Combos">
                        <p>
                            Instead of string combos, use <span class="ic">HotkeyCombo</span> objects
                            for programmatic or complex definitions. Object combos can also carry
                            inline <span class="ic">global</span> and <span class="ic">preventDefault</span> settings.
                        </p>
                        <table class="api-table">
                            <thead><tr><th>Property</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                            <tbody>
                                <tr><td><code>key</code></td><td>string</td><td>—</td><td>Key to match (e.g. "k", "escape")</td></tr>
                                <tr><td><code>ctrl</code></td><td>boolean</td><td>false</td><td>Require Ctrl</td></tr>
                                <tr><td><code>shift</code></td><td>boolean</td><td>false</td><td>Require Shift</td></tr>
                                <tr><td><code>alt</code></td><td>boolean</td><td>false</td><td>Require Alt / Option</td></tr>
                                <tr><td><code>meta</code></td><td>boolean</td><td>false</td><td>Require Meta / Cmd / Win</td></tr>
                                <tr><td><code>mod</code></td><td>boolean</td><td>false</td><td>⌘ on Mac, Ctrl elsewhere</td></tr>
                                <tr><td><code>global</code></td><td>boolean</td><td>false</td><td>Listen on document</td></tr>
                                <tr><td><code>preventDefault</code></td><td>boolean</td><td>true</td><td>Call e.preventDefault()</td></tr>
                            </tbody>
                        </table>
                        <code-block lang="ts" code={OBJECT_COMBOS}></code-block>
                </doc-section>
                <doc-section heading="Examples">
                    <code-block lang="ts" code={EXAMPLES}></code-block>
                </doc-section>
                <doc-section heading="Printing the shortcut">
                    <p>
                        A shortcut usually has to appear somewhere in the UI, and typing that
                        hint out by hand creates a second copy of the binding that nothing keeps
                        in step. It also cannot be right on both platforms at once —
                        <span class="ic"> mod+k</span> is Cmd on a Mac and Ctrl everywhere else, and a hardcoded
                        hint has to pick one.
                    </p>
                    <p>
                        So the decorator attaches the printed form to the method it decorates.
                        It comes from the same parse the matcher uses, which is what makes it
                        impossible for the label and the binding to disagree.
                    </p>
                    <code-block lang="tsx" code={LABELS}></code-block>
                    <table class="api-table">
                        <thead>
                            <tr><th>Helper</th><th>Returns</th></tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>hotkeyLabel(method)</code></td>
                                <td>The first combo, printed for this platform. <code>""</code> if the method has no hotkey.</td>
                            </tr>
                            <tr>
                                <td><code>hotkeyLabels(method)</code></td>
                                <td>Every combo, in declaration order.</td>
                            </tr>
                        </tbody>
                    </table>
                    <doc-notification type="note">
                        On a Mac the label uses Apple's modifier order and no separators
                        (<span class="ic">\u2303\u2325\u21e7\u2318K</span>); everywhere else it is joined with
                        <span class="ic"> +</span>. Named keys are printed rather than passed through, so
                        <span class="ic"> escape</span> becomes <span class="ic">Esc</span> and
                        <span class="ic"> arrowup</span> becomes <span class="ic">\u2191</span>.
                    </doc-notification>
                </doc-section>
                <doc-section heading="Live Demo">
                        <p>
                            Press the shortcut shown in the sidebar search field right now — this
                            site's palette is bound with <span class="ic">@hotkey</span>, and that hint is
                            <span class="ic"> hotkeyLabel()</span> reading the binding rather than a string
                            somebody typed:
                        </p>
                        <code-block lang="ts" code={LIVE_DEMO}></code-block>
                        <doc-notification type="note">
                            This is the actual code running in this docs site.
                        </doc-notification>
                </doc-section>
                <doc-section heading="How It Works">
                    <ul>
                        <li>Combo strings are parsed once and cached — zero overhead per keydown</li>
                        <li>Built on <span class="ic">CONNECT_HOOKS</span> — listeners auto-removed on disconnect</li>
                        <li>Non-global hotkeys auto-add <span class="ic">tabindex="0"</span> so the element can receive focus</li>
                        <li>Existing <span class="ic">tabindex</span> attributes are preserved</li>
                        <li>The <span class="ic">mod</span> modifier detects macOS via <span class="ic">navigator.platform</span>, and the printed label uses that same detection</li>
                    </ul>
                </doc-section>
              <doc-nav></doc-nav>
      </div>
        );
    }
}

const QUICK_START = `import { hotkey } from "@toyz/loom/element";

// Open search with ⌘K (Mac) or Ctrl+K (Windows/Linux)
@hotkey("mod+k")
openSearch() {
  this.searchOpen = true;
}

// Close on Escape — global so it works even without focus
@hotkey("escape", { global: true })
close() {
  this.open = false;
}`;

const EXAMPLES = `// Single shortcut
@hotkey("ctrl+k")
openSearch() { ... }

// Multiple bindings — first match wins
@hotkey("ctrl+s", "cmd+s")
save() { this.persist(); }

// Modifier combos
@hotkey("ctrl+shift+p")
openCommandPalette() { ... }

// Cross-platform with "mod" (⌘ on Mac, Ctrl elsewhere)
@hotkey("mod+z")
undo() { this.history.pop(); }

// Global mode — listens on document, not the element
@hotkey("escape", { global: true })
closeModal() { this.modalOpen = false; }

// Opt out of preventDefault
@hotkey("ctrl+a", { preventDefault: false })
selectAll() { this.allSelected = true; }

// Mix string and object combos
@hotkey("ctrl+k", { key: "k", meta: true }, { global: true })
openSearch() { ... }`;

const OBJECT_COMBOS = `// Object combo — explicit modifiers
@hotkey({ key: "k", mod: true, global: true })
openSearch() { ... }

// Multi-modifier with shift
@hotkey({ key: "p", ctrl: true, shift: true })
openCommandPalette() { ... }

// Inline options — no trailing options object needed
@hotkey({ key: "escape", global: true, preventDefault: false })
closeModal() { this.open = false; }

// Mix string + object — both work together
@hotkey("ctrl+s", { key: "s", meta: true })
save() { this.persist(); }`;

const LABELS = `import { hotkey, hotkeyLabel, hotkeyLabels } from "@toyz/loom/element";

@component("command-bar")
class CommandBar extends LoomElement {
  @hotkey("mod+k", { global: true })
  open() { this.visible = true; }

  @hotkey("ctrl+s", "meta+s")
  save() { /* ... */ }

  update() {
    return (
      <button onClick={() => this.open()}>
        Search
        {/* "Ctrl+K" on Windows and Linux, "\u2318K" on a Mac */}
        <kbd>{hotkeyLabel(this.open)}</kbd>
      </button>
    );
  }
}

// Every combo a method is bound to, in declaration order
hotkeyLabels(CommandBar.prototype.save);  // ["Ctrl+S", "\u2318S"]`;

const LIVE_DEMO = `// From docs/src/components/doc-search.tsx — the actual code!
@component("doc-search")
export class DocSearch extends LoomElement {
  @hotkey("ctrl+k", "meta+k", { global: true })
  openViaHotkey() {
    this.open();
  }

  // ... rest of search implementation
}`;
