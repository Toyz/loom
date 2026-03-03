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
                <h1>@hotkey</h1>
                <p class="subtitle">
                    Declarative keyboard shortcuts with auto-cleanup on disconnect.
                </p>

                <section>
                    <div class="group-header">
                        <loom-icon name="sparkles" size={20} color="var(--emerald)"></loom-icon>
                        <h2>Quick Start</h2>
                    </div>
                    <code-block lang="ts" code={QUICK_START}></code-block>
                </section>

                <section>
                    <div class="group-header">
                        <loom-icon name="book" size={20} color="var(--accent)"></loom-icon>
                        <h2>API</h2>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-sig">@hotkey(...combos, options?)</div>
                        <div class="dec-desc">
                            Binds a method to one or more keyboard shortcuts. Combos can be
                            strings (<span class="ic">"mod+k"</span>) or objects
                            (<span class="ic">{"{ key, mod, ctrl, ... }"}</span>). Mix freely.
                            Listeners are auto-cleaned on disconnect.
                        </div>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-desc">
                            <strong>Options:</strong>
                        </div>
                        <table class="api-table">
                            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                            <tbody>
                                <tr><td><code>global</code></td><td>boolean</td><td>false</td><td>Listen on <code>document</code> instead of the element</td></tr>
                                <tr><td><code>preventDefault</code></td><td>boolean</td><td>true</td><td>Call <code>e.preventDefault()</code> on match</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <div class="group-header">
                        <loom-icon name="command" size={20} color="var(--amber)"></loom-icon>
                        <h2>Key Combos</h2>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-desc">
                            Combos use <span class="ic">+</span> to join modifiers and a key.
                            Case-insensitive. Supported modifiers:
                        </div>
                        <table class="api-table">
                            <thead><tr><th>Modifier</th><th>Aliases</th><th>Meaning</th></tr></thead>
                            <tbody>
                                <tr><td><code>ctrl</code></td><td>control</td><td>Control key</td></tr>
                                <tr><td><code>shift</code></td><td>—</td><td>Shift key</td></tr>
                                <tr><td><code>alt</code></td><td>option</td><td>Alt / Option key</td></tr>
                                <tr><td><code>meta</code></td><td>cmd, command, win</td><td>Meta / Command / Windows key</td></tr>
                                <tr><td><code>mod</code></td><td>—</td><td>⌘ on Mac, Ctrl elsewhere</td></tr>
                            </tbody>
                        </table>
                        <div class="note">
                            Use <span class="ic">mod</span> for cross-platform shortcuts — it maps to{" "}
                            <span class="ic">⌘ Cmd</span> on macOS and <span class="ic">Ctrl</span> everywhere else.
                        </div>
                    </div>
                </section>

                <section>
                    <div class="group-header">
                        <loom-icon name="hash" size={20} color="var(--rose)"></loom-icon>
                        <h2>Object Combos</h2>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-desc">
                            Instead of string combos, use <span class="ic">HotkeyCombo</span> objects
                            for programmatic or complex definitions. Object combos can also carry
                            inline <span class="ic">global</span> and <span class="ic">preventDefault</span> settings.
                        </div>
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
                    </div>
                </section>

                <section>
                    <div class="group-header">
                        <loom-icon name="layers" size={20} color="var(--cyan)"></loom-icon>
                        <h2>Examples</h2>
                    </div>
                    <code-block lang="ts" code={EXAMPLES}></code-block>
                </section>

                <section>
                    <div class="group-header">
                        <loom-icon name="zap" size={20} color="var(--rose)"></loom-icon>
                        <h2>Live Demo</h2>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-desc">
                            Try pressing <span class="ic">⌘K</span> or <span class="ic">Ctrl+K</span> right now — the
                            docs search is powered by <span class="ic">@hotkey</span>:
                        </div>
                        <code-block lang="ts" code={LIVE_DEMO}></code-block>
                        <div class="note">
                            This is the actual code running in this docs site. The search palette
                            you see when pressing ⌘K uses <span class="ic">@hotkey</span> for its keyboard shortcut.
                        </div>
                    </div>
                </section>

                <section>
                    <div class="group-header">
                        <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
                        <h2>How It Works</h2>
                    </div>
                    <ul>
                        <li>Combo strings are parsed once and cached — zero overhead per keydown</li>
                        <li>Built on <span class="ic">CONNECT_HOOKS</span> — listeners auto-removed on disconnect</li>
                        <li>Non-global hotkeys auto-add <span class="ic">tabindex="0"</span> so the element can receive focus</li>
                        <li>Existing <span class="ic">tabindex</span> attributes are preserved</li>
                        <li>The <span class="ic">mod</span> modifier detects macOS via <span class="ic">navigator.platform</span></li>
                    </ul>
                </section>
            </div>
        );
    }
}

const QUICK_START = `import { hotkey } from "@toyz/loom";

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

const LIVE_DEMO = `// From docs/src/components/doc-search.tsx — the actual code!
@component("doc-search")
export class DocSearch extends LoomElement {
  @hotkey("ctrl+k", "meta+k", { global: true })
  openViaHotkey() {
    this.open();
  }

  // ... rest of search implementation
}`;
