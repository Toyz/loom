/**
 * <spec-card> — a punch card, fed through a reader, on a canvas.
 *
 * The one piece of pure whimsy in this design, in the dead space at the foot
 * of the right rail. It is not a decorative pattern: each card is drawn with
 * its text genuinely encoded in Hollerith, the IBM 029 keypunch code, one
 * column of punches per character. Read the columns and you get the string
 * printed along the top, which is exactly what an operator did.
 *
 * Every fact it prints is true and checkable. A decorative widget that states
 * invented numbers is worse than no widget, so the version comes from the
 * package at build time, the star count comes from GitHub, and the rest are
 * architectural claims stated on their own pages.
 *
 * Drawn through <loom-canvas>, so it shares the one render loop the rest of
 * the site uses rather than starting a second rAF. It is aria-hidden and
 * stops entirely under prefers-reduced-motion — an animation nobody asked for
 * should be the first thing to turn itself off.
 */

import { LoomElement, component, reactive, css, styles, interval } from "@toyz/loom";
import { t } from "../tokens";
import { api } from "@toyz/loom/query";
import "@toyz/loom/element/canvas"; // side effect: defines <loom-canvas>
import type { ApiState } from "@toyz/loom/query";

interface Spec { label: string; value: string }
interface Repo { stargazers_count: number }

const SPECS: readonly Spec[] = [
  { label: "VERSION", value: `V${__LOOM_VERSION__}` },
  { label: "DEPENDENCIES", value: "ZERO" },
  { label: "VIRTUAL DOM", value: "NONE" },
  { label: "UPDATE TIERS", value: "THREE" },
  { label: "DECORATORS", value: "TC39" },
  { label: "TESTS", value: String(__LOOM_TESTS__) },
];

/* ── Hollerith (IBM 029) ──
   A card has 12 rows: 12 and 11 at the top (the "zone" rows), then 0-9.
   A digit is one punch in its own row. A letter is a zone punch plus a
   digit punch: A-I are 12+1..9, J-R are 11+1..9, S-Z are 0+2..9. That is
   the entire code for the characters used here. */

const ROWS = 12;                       // index 0 = row 12, 1 = row 11, 2 = row 0, 3..11 = rows 1-9
const ZONE_12 = 0, ZONE_11 = 1, ZONE_0 = 2;
const digitRow = (d: number) => (d === 0 ? ZONE_0 : d + 2);

function punches(ch: string): number[] {
  if (ch >= "0" && ch <= "9") return [digitRow(+ch)];
  if (ch >= "A" && ch <= "I") return [ZONE_12, digitRow(ch.charCodeAt(0) - 64)];
  if (ch >= "J" && ch <= "R") return [ZONE_11, digitRow(ch.charCodeAt(0) - 73)];
  if (ch >= "S" && ch <= "Z") return [ZONE_0, digitRow(ch.charCodeAt(0) - 82 + 1)];
  if (ch === ".") return [ZONE_12, digitRow(3), digitRow(8)];
  return [];                            // space, and anything unencodable
}

const cardStyles = css`
  :host { display: block; margin-top: 28px; }

  .frame {
    background: ${t.groundSunk};
    border: 1px solid ${t.warp};
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
    padding: 9px 10px 10px;
  }

  .head {
    display: flex;
    justify-content: space-between;
    font-family: ${t.fontMono};
    font-size: 0.5rem;
    letter-spacing: 0.14em;
    color: ${t.textMuted};
    margin-bottom: 7px;
  }

  loom-canvas { display: block; height: 74px; }

  /* The animation is ornament. If the reader has asked for less motion, the
     card is simply not drawn at all and the label below carries the fact. */
  @media (prefers-reduced-motion: reduce) {
    loom-canvas { display: none; }
  }

  .value {
    font-family: ${t.fontMono};
    font-size: 0.8125rem;
    font-weight: 600;
    color: ${t.textPrimary};
    margin-top: 7px;
  }
`;

@component("spec-card")
@styles(cardStyles)
export class SpecCard extends LoomElement {
  @reactive accessor index = 0;

  /**
   * Star count, fetched once. Unauthenticated GitHub allows 60 requests an
   * hour per IP, ample for one call on mount. The row simply does not appear
   * if the call fails or is rate-limited — a spec card printing a dash where
   * a number should be is worse than one with six rows instead of seven.
   */
  @api<Repo>(() => fetch("https://api.github.com/repos/Toyz/loom").then((r) => r.json()))
  accessor repo!: ApiState<Repo>;

  /** Where the card is in its travel: 0 entering, 1 fully off to the left. */
  private t = 0;

  private get rows(): readonly Spec[] {
    const stars = this.repo.data?.stargazers_count;
    return typeof stars === "number"
      ? [...SPECS, { label: "GITHUB STARS", value: String(stars) }]
      : SPECS;
  }

  private get current(): Spec {
    const r = this.rows;
    return r[this.index % r.length]!;
  }

  /** Feed the next card. The draw loop eases between them. */
  @interval(3600)
  advance() {
    this.index = (this.index + 1) % this.rows.length;
    this.t = 0;
  }

  private drawCard = (ctx: CanvasRenderingContext2D, dt: number) => {
    const { width: w, height: h } = ctx.canvas;
    ctx.clearRect(0, 0, w, h);

    // Advance the feed. dt is 0 on the very first frame, which is why this
    // multiplies rather than divides by it.
    this.t = Math.min(1, this.t + dt * 0.55);

    // Ease out, then hold: the card slides in and settles rather than
    // travelling at a constant speed across the whole dwell.
    const eased = 1 - Math.pow(1 - Math.min(1, this.t * 2.4), 3);
    const x = (1 - eased) * w;

    const text = this.current.value;
    const cols = Math.max(text.length, 10);
    const pad = 6;
    const cardW = w - pad * 2;
    const cardH = h - pad * 2;
    const colW = cardW / cols;
    const rowH = (cardH - 16) / ROWS;

    ctx.save();
    ctx.translate(x, 0);

    // Card stock, with the clipped corner a real card has so it cannot be
    // loaded upside down.
    const cut = 9;
    ctx.beginPath();
    ctx.moveTo(pad, pad + cut);
    ctx.lineTo(pad + cut, pad);
    ctx.lineTo(pad + cardW, pad);
    ctx.lineTo(pad + cardW, pad + cardH);
    ctx.lineTo(pad, pad + cardH);
    ctx.closePath();
    ctx.fillStyle = "#1c1c15";
    ctx.fill();
    ctx.strokeStyle = "#4a4839";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Printed row along the top, as the keypunch prints what it punched.
    ctx.fillStyle = "#a09a88";
    ctx.font = "8px 'IBM Plex Mono', monospace";
    ctx.textBaseline = "top";
    ctx.fillText(text, pad + 4, pad + 4);

    // The punches themselves.
    const top = pad + 15;
    for (let c = 0; c < cols; c++) {
      const on = punches(text[c] ?? " ");
      for (let r = 0; r < ROWS; r++) {
        const px = pad + 3 + c * colW;
        const py = top + r * rowH;
        const pw = Math.max(2, colW - 3);
        const ph = Math.max(1.5, rowH - 1.5);
        if (on.includes(r)) {
          ctx.fillStyle = "#c4472f";
          ctx.fillRect(px, py, pw, ph);
        } else {
          ctx.fillStyle = "rgba(74,72,57,0.5)";
          ctx.fillRect(px, py, pw, Math.min(ph, 1));
        }
      }
    }

    ctx.restore();
  };

  update() {
    const spec = this.current;
    const rows = this.rows;
    return (
      <div class="frame" aria-hidden="true">
        <div class="head">
          <span>{spec.label}</span>
          <span>{String((this.index % rows.length) + 1).padStart(2, "0")}/{rows.length}</span>
        </div>
        <loom-canvas draw={this.drawCard}></loom-canvas>
        <div class="value">{spec.value}</div>
      </div>
    );
  }
}
