/**
 * Docs — Image Element
 *
 * Reference page for <loom-image> — lazy-loaded, cached images
 * with skeleton placeholders and smooth fade-in.
 */
import { LoomElement } from "@toyz/loom";

export default class PageElementImage extends LoomElement {
  update() {
    return (
      <div>
        <h1>&lt;loom-image&gt;</h1>
        <p class="subtitle">
          Lazy-loaded images with an in-memory cache, customizable placeholder,
          and smooth fade-in — powered by <span class="ic">@observer("intersection")</span>.
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
            <h2>Props</h2>
          </div>
          <table class="api-table">
            <thead>
              <tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>src</code></td>
                <td>string</td>
                <td>""</td>
                <td>Image URL — only fetched when the element enters the viewport</td>
              </tr>
              <tr>
                <td><code>alt</code></td>
                <td>string</td>
                <td>""</td>
                <td>Alt text for accessibility</td>
              </tr>
              <tr>
                <td><code>width</code></td>
                <td>number</td>
                <td>0</td>
                <td>Fixed width in CSS pixels (optional)</td>
              </tr>
              <tr>
                <td><code>height</code></td>
                <td>number</td>
                <td>0</td>
                <td>Fixed height in CSS pixels (optional)</td>
              </tr>
              <tr>
                <td><code>fit</code></td>
                <td>string</td>
                <td>"cover"</td>
                <td>CSS object-fit value (cover, contain, fill, etc.)</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="settings" size={20} color="var(--cyan)"></loom-icon>
            <h2>Static Methods</h2>
          </div>
          <table class="api-table">
            <thead>
              <tr><th>Method</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>LoomImage.preload(...urls)</code></td><td>Preload images into the cache — returns a Promise</td></tr>
              <tr><td><code>LoomImage.clearCache(url?)</code></td><td>Clear all or a specific cached image</td></tr>
              <tr><td><code>LoomImage.isCached(url)</code></td><td>Check if a URL is already cached</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="layers" size={20} color="var(--amber)"></loom-icon>
            <h2>How It Works</h2>
          </div>
          <ul>
            <li><span class="ic">@observer("intersection")</span> watches for the element to enter the viewport (with 200px root margin for pre-fetching)</li>
            <li>On first intersection, the image is fetched and stored in a static <span class="ic">Map</span> cache</li>
            <li>Repeated URLs skip the network entirely — the cached <span class="ic">HTMLImageElement</span> is reused instantly</li>
            <li>A default shimmer skeleton shows while loading, or slot your own placeholder</li>
            <li>The image fades in with a 300ms <span class="ic">opacity</span> transition</li>
            <li><span class="ic">loom-keep</span> prevents the <span class="ic">&lt;img&gt;</span> from being morphed</li>
          </ul>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="box" size={20} color="var(--accent)"></loom-icon>
            <h2>Custom Placeholder</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Pass any element into the <span class="ic">placeholder</span> slot to
              replace the default shimmer. It fades out when the image loads.
            </div>
            <code-block lang="tsx" code={CUSTOM_PLACEHOLDER}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="zap" size={20} color="var(--rose)"></loom-icon>
            <h2>Preloading</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              Preload critical images before they scroll into view — perfect for hero
              images or above-the-fold content:
            </div>
            <code-block lang="ts" code={PRELOAD}></code-block>
          </div>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20} color="var(--emerald)"></loom-icon>
            <h2>Gallery Example</h2>
          </div>
          <div class="feature-entry">
            <div class="dec-desc">
              A responsive image grid with free lazy loading — images only fetch
              as they scroll into view:
            </div>
            <code-block lang="tsx" code={GALLERY}></code-block>
          </div>
        </section>
      </div>
    );
  }
}

const QUICK_START = `import { LoomElement, component } from "@toyz/loom";
import "@toyz/loom/element/image";

@component("my-page")
class MyPage extends LoomElement {
  update() {
    return (
      <div>
        {/* Basic — lazy-loaded automatically */}
        <loom-image src="/photo.jpg" alt="A photo" />

        {/* Fixed size with contain fit */}
        <loom-image
          src="/hero.png"
          width={800}
          height={400}
          fit="contain"
        />
      </div>
    );
  }
}`;

const PRELOAD = `import { LoomImage } from "@toyz/loom/element/image";

// Preload critical images at app startup
await LoomImage.preload(
  "/hero-banner.jpg",
  "/logo.svg",
  "/avatar.png",
);

// Check cache status
console.log(LoomImage.isCached("/hero-banner.jpg")); // true

// Clear cache when needed
LoomImage.clearCache(); // clear all`;

const CUSTOM_PLACEHOLDER = `{/* Default — built-in shimmer skeleton */}
<loom-image src="/photo.jpg" />

{/* Custom placeholder — pass any element */}
<loom-image src="/hero.jpg">
  <div slot="placeholder" style="
    background: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  ">
    <span>Loading...</span>
  </div>
</loom-image>

{/* Use a Loom component as placeholder */}
<loom-image src="/avatar.png">
  <my-skeleton slot="placeholder" />
</loom-image>`;

const GALLERY = `@component("photo-gallery")
@styles(css\`
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }
  loom-image {
    border-radius: 12px;
    aspect-ratio: 1;
  }
\`)
class PhotoGallery extends LoomElement {
  @reactive accessor photos: string[] = [];

  update() {
    return (
      <div class="grid">
        {this.photos.map(url => (
          <loom-image src={url} fit="cover" />
        ))}
      </div>
    );
  }
}`;
