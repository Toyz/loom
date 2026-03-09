/**
 * Docs — @fullscreen decorator
 */
import { LoomElement } from "@toyz/loom";

export default class PageDecoratorFullscreen extends LoomElement {
    update() {
        return (
            <div>
                <doc-header title="@fullscreen" subtitle="Boolean accessor bound to the Fullscreen API. Toggle fullscreen by setting a field — syncs with Escape key and external changes."></doc-header>

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
                        <div class="dec-sig">@fullscreen(options?)</div>
                        <div class="dec-desc">
                            Accessor decorator. Setting to <code>true</code> calls <code>requestFullscreen()</code>,
                            <code>false</code> calls <code>exitFullscreen()</code>. Listens for <code>fullscreenchange</code>
                            events to stay in sync.
                        </div>
                    </div>
                    <div class="feature-entry">
                        <div class="dec-desc"><strong>Options:</strong></div>
                        <table class="api-table">
                            <thead><tr><th>Option</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
                            <tbody>
                                <tr><td><code>navigationUI</code></td><td>"auto" | "hide" | "show"</td><td>"auto"</td><td>Navigation UI preference for fullscreen</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <div class="group-header">
                        <loom-icon name="settings" size={20} color="var(--emerald)"></loom-icon>
                        <h2>How It Works</h2>
                    </div>
                    <ul>
                        <li>Setting the field to <span class="ic">true</span> enters fullscreen for the host element</li>
                        <li>Setting to <span class="ic">false</span> exits fullscreen (only if this element is fullscreen)</li>
                        <li>Listens for <span class="ic">fullscreenchange</span> events — auto-syncs when user presses Escape</li>
                        <li>On disconnect, exits fullscreen if the component was fullscreen</li>
                    </ul>
                </section>
              <doc-nav></doc-nav>
      </div>
        );
    }
}

const QUICK_START = `import { LoomElement, component } from "@toyz/loom";
import { fullscreen } from "@toyz/loom/element";

@component("video-player")
class VideoPlayer extends LoomElement {
  @fullscreen()
  accessor isFullscreen = false;

  update() {
    return <div>
      <video src="movie.mp4"></video>
      <button onClick={() => this.isFullscreen = !this.isFullscreen}>
        {this.isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      </button>
    </div>;
  }
}`;
