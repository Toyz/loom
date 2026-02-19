/**
 * Example — Image Gallery
 *
 * Live demo of <loom-image> with lazy loading, caching,
 * and custom placeholders using rgba.lol images.
 */
import { LoomElement, component, styles, css } from "@toyz/loom";
import "@toyz/loom/element/image";

const IMAGES = [
  "https://rgba.lol/e8/45/6b/ff/300x300.png",
  "https://rgba.lol/81/8c/f8/ff/300x300.png",
  "https://rgba.lol/34/d3/99/ff/300x300.png",
  "https://rgba.lol/fb/bc/04/ff/300x300.png",
  "https://rgba.lol/a7/8b/fa/ff/300x300.png",
  "https://rgba.lol/f9/73/16/ff/300x300.png",
  "https://rgba.lol/06/b6/d4/ff/300x300.png",
  "https://rgba.lol/ec/48/99/ff/300x300.png",
  "https://rgba.lol/22/c5/5e/ff/300x300.png",
  "https://rgba.lol/ff/6b/6b/ff/300x300.png",
  "https://rgba.lol/4e/c9/b0/ff/300x300.png",
  "https://rgba.lol/95/6f/f5/ff/300x300.png",
];

const SOURCE = `import { LoomElement, component, styles, css } from "@toyz/loom";
import "@toyz/loom/element/image";

const IMAGES = [
  "https://rgba.lol/e8/45/6b/ff/300x300.png",
  "https://rgba.lol/81/8c/f8/ff/300x300.png",
  "https://rgba.lol/34/d3/99/ff/300x300.png",
  "https://rgba.lol/fb/bc/04/ff/300x300.png",
  "https://rgba.lol/a7/8b/fa/ff/300x300.png",
  "https://rgba.lol/f9/73/16/ff/300x300.png",
  "https://rgba.lol/06/b6/d4/ff/300x300.png",
  "https://rgba.lol/ec/48/99/ff/300x300.png",
];

@component("image-gallery")
@styles(css\`
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 1rem;
  }
  loom-image {
    border-radius: 12px;
    aspect-ratio: 1;
    width: 100%;
  }
\`)
class ImageGallery extends LoomElement {
  update() {
    return (
      <div class="grid">
        {IMAGES.map((url, i) => (
          <loom-image src={url} alt={"Swatch " + (i+1)} />
        ))}
      </div>
    );
  }
}`;

export default class PageExampleImageGallery extends LoomElement {
  update() {
    return (
      <div>
        <h1>Image Gallery</h1>
        <p class="subtitle">
          A responsive grid of <span class="ic">&lt;loom-image&gt;</span> elements
          — each one lazy-loads on scroll and is cached in memory.
          Images served by <a href="https://rgba.lol" target="_blank">rgba.lol</a>.
        </p>

        <section>
          <h2>Demo</h2>
          <p class="hint" style="margin-bottom:0.5rem;color:var(--text-muted);font-size:0.85rem;">
            Navigate away and come back — cached images load instantly.
          </p>
          <style>{`
            .image-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
              gap: 1rem;
              margin-top: 1rem;
            }
            .image-grid loom-image {
              border-radius: 12px;
              aspect-ratio: 1;
              width: 100%;
            }
            .custom-skeleton {
              width: 100%;
              height: 100%;
              background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
              background-size: 200% 200%;
              animation: skeleton-pulse 2s ease-in-out infinite;
              display: flex;
              align-items: center;
              justify-content: center;
              color: rgba(255,255,255,0.25);
              font-size: 0.75rem;
              font-family: monospace;
              border-radius: inherit;
            }
            @keyframes skeleton-pulse {
              0%, 100% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
            }
          `}</style>
          <div class="image-grid">
            {IMAGES.map((url, i) => (
              <loom-image src={url} alt={`Color swatch ${i + 1}`} fit="cover">
                <div slot="placeholder" class="custom-skeleton">
                  loading...
                </div>
              </loom-image>
            ))}
          </div>
        </section>

        <section>
          <h2>Source</h2>
          <code-block lang="tsx" code={SOURCE}></code-block>
        </section>
      </div>
    );
  }
}
