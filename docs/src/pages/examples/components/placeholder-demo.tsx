/**
 * Placeholder Demo Component — <placeholder-demo>
 *
 * Interactive demo of <loom-placeholder> with RgbaPlaceholder.
 * Adjust color, size, and format in real time to see the component react.
 */
import { LoomElement, component, reactive, css, styles, app } from "@toyz/loom";
import { t } from "../../../tokens";
import {
  PlaceholderProvider,
  RgbaPlaceholder,
} from "@toyz/loom-placeholder";
import { scrollbar } from "../../../shared/scrollbar";
import "../../../shared/tooltip";

// Register provider for the demo
app.use(PlaceholderProvider, new RgbaPlaceholder());

// ── Styles ──

const demoStyles = css`
  :host { display: block; }

  .demo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 1rem;
  }
  @media (max-width: 768px) { .demo-grid { grid-template-columns: 1fr; } }

  .panel {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 0;
    padding: 1.25rem;
  }

  .panel h3 {
    margin: 0 0 1rem;
    font-size: 0.95rem;
    color: ${t.thread};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .panel h3 .badge {
    font-size: 0.7rem;
    padding: 0.15rem 0.5rem;
    border-radius: 0;
    background: rgba(167,139,250,0.15);
    color: ${t.thread};
    font-weight: 600;
  }

  .control-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 0;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 0.5rem;
  }

  .control-label {
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--text-primary);
    min-width: 60px;
  }

  input[type="range"] {
    flex: 1;
    accent-color: ${t.thread};
    cursor: pointer;
  }

  input[type="color"] {
    width: 40px;
    height: 32px;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 0;
    background: transparent;
    cursor: pointer;
    padding: 0;
  }

  .value-display {
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.75rem;
    color: var(--text-secondary);
    min-width: 40px;
    text-align: right;
  }

  .preview-panel {
    grid-column: 1 / -1;
  }

  .preview-area {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 2rem;
    background: rgba(0,0,0,0.3);
    border-radius: 0;
    position: relative;
  }

  .preview-area loom-placeholder {
    border-radius: 0;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
    background-image:
      linear-gradient(45deg, ${t.warpLit} 25%, transparent 25%),
      linear-gradient(-45deg, ${t.warpLit} 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, ${t.warpLit} 75%),
      linear-gradient(-45deg, transparent 75%, ${t.warpLit} 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    background-color: #666;
  }

  .url-display {
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(0,0,0,0.4);
    border-radius: 0;
    font-family: "JetBrains Mono", "Fira Code", monospace;
    font-size: 0.75rem;
    color: ${t.ok};
    word-break: break-all;
    border: 1px solid rgba(52,211,153,0.15);
  }

  .preset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .preset {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 0;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s;
  }

  .preset:hover {
    transform: scale(1.1);
    border-color: rgba(167,139,250,0.5);
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
  }

  .preset.active {
    border-color: ${t.thread};
    box-shadow: 0 0 0 2px rgba(167,139,250,0.3);
  }

  select {
    background: rgba(255,255,255,0.06);
    color: var(--text-primary);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 0;
    padding: 0.35rem 0.5rem;
    font-size: 0.8rem;
    font-family: inherit;
    cursor: pointer;
  }
`;

const PRESETS = [
  { color: "ff0000", label: "Red" },
  { color: "00ff00", label: "Green" },
  { color: "0000ff", label: "Blue" },
  { color: "ff00ff", label: "Magenta" },
  { color: "00ffff", label: "Cyan" },
  { color: "ffff00", label: "Yellow" },
  { color: "ff6600", label: "Orange" },
  { color: "6633ff", label: "Violet" },
  { color: "000000", label: "Black" },
  { color: "ffffff", label: "White" },
  { color: "808080", label: "Gray" },
  { color: "ff3399", label: "Hot Pink" },
];

@component("placeholder-demo")
@styles(demoStyles, scrollbar)
class PlaceholderDemo extends LoomElement {
  @reactive accessor color = "6633ff";
  @reactive accessor width = 300;
  @reactive accessor height = 200;
  @reactive accessor format: "png" | "svg" = "png";

  get hexColor(): string {
    return this.color.replace(/^#/, "");
  }

  get generatedUrl(): string {
    const provider = app.get(PlaceholderProvider) as RgbaPlaceholder;
    const hex = this.hexColor;
    const r = parseInt(hex.slice(0, 2) || "cc", 16);
    const g = parseInt(hex.slice(2, 4) || "cc", 16);
    const b = parseInt(hex.slice(4, 6) || "cc", 16);
    const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) : undefined;
    return provider.rgba({ r, g, b, a, width: this.width, height: this.height, format: this.format });
  }

  setPreset(c: string) {
    this.color = c;
  }

  update() {
    return (
      <div>
        <div class="demo-grid">
          {/* Left: Controls */}
          <div class="panel">
            <h3>
              Controls <span class="badge">props</span>
            </h3>

            <div class="control-row">
              <span class="control-label">Color</span>
              <input
                type="color"
                value={`#${this.hexColor.slice(0, 6)}`}
                onInput={(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.color = val.replace("#", "");
                }}
              />
              <span class="value-display">{this.hexColor}</span>
            </div>

            <div class="control-row">
              <span class="control-label">Width</span>
              <input
                type="range"
                min={16}
                max={600}
                value={this.width}
                onInput={(e: Event) => { this.width = +(e.target as HTMLInputElement).value; }}
              />
              <span class="value-display">{this.width}px</span>
            </div>

            <div class="control-row">
              <span class="control-label">Height</span>
              <input
                type="range"
                min={16}
                max={400}
                value={this.height}
                onInput={(e: Event) => { this.height = +(e.target as HTMLInputElement).value; }}
              />
              <span class="value-display">{this.height}px</span>
            </div>

            <div class="control-row">
              <span class="control-label">Format</span>
              <doc-select
                label="Format"
                value={this.format}
                options={[
                  { value: "png", label: "PNG", note: "raster" },
                  { value: "svg", label: "SVG", note: "vector" },
                ]}
                onSelect={(v: string) => { this.format = v as "png" | "svg"; }}
              ></doc-select>
            </div>
          </div>

          {/* Right: Presets */}
          <div class="panel">
            <h3>
              Presets <span class="badge">click to apply</span>
            </h3>
            <div class="preset-grid">
              {PRESETS.map(p => (
                <doc-tooltip text={p.label}>
                  <div
                    class={`preset ${this.hexColor === p.color ? "active" : ""}`}
                    style={{ background: `#${p.color}` }}
                    title={p.label}
                    onClick={() => this.setPreset(p.color)}
                  ></div>
                </doc-tooltip>
              ))}
            </div>
          </div>

          {/* Bottom: Preview */}
          <div class="panel preview-panel">
            <h3>
              Preview <span class="badge">live</span>
            </h3>
            <div class="preview-area">
              <loom-placeholder
                color={this.hexColor}
                width={this.width}
                height={this.height}
                format={this.format}
              ></loom-placeholder>
            </div>
            <div class="url-display">
              {this.generatedUrl}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
