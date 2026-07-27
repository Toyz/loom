/**
 * The docs palette, declared once.
 *
 * Generated from the `:root` block in styles.css, which stays the definition
 * the page actually loads. What this replaces is the *fallback* half: every
 * component was writing `var(--text-muted, #6d6858)` by hand, 479 times, and
 * the fallbacks had drifted -- `--text-muted` carried five different values
 * and `--accent` two unrelated purples. A fallback only renders when the
 * token is missing, so the drift was invisible right up until it wasn't, and
 * what it rendered was a second palette nobody designed.
 *
 * ```ts
 * import { t } from "../tokens";
 * const styles = css`:host { color: ${t.textMuted}; }`;
 * ```
 *
 * Aliases (`--accent: var(--thread)`) are resolved to the value they end at,
 * so `t.accent` falls back to a real colour. A fallback that points at another
 * `var()` is worthless -- if the first token is undefined the second almost
 * certainly is too -- and is how the self-referential entries in that drift
 * report happened.
 */

import { tokens } from "@toyz/loom";

export const t = tokens({
  ground: "#14140f",
  groundRaised: "#1c1c15",
  groundSunk: "#100f0b",
  groundHover: "#24241b",
  card: "#8f8873",
  cardEdge: "#7c7561",
  cardInk: "#14130d",
  warp: "#33322a",
  warpLit: "#4a4839",
  thread: "#c4472f",
  threadDim: "#8f3423",
  threadWash: "rgba(196, 71, 47, 0.10)",
  indigo: "#6b8cae",
  indigoDim: "#47607a",
  textPrimary: "#e6e1d3",
  textSecondary: "#a09a88",
  textMuted: "#6d6858",
  ok: "#7f9c5a",
  warn: "#c99a3d",
  fontDisplay: "'IBM Plex Sans Condensed', 'IBM Plex Sans', system-ui, sans-serif",
  fontSans: "'IBM Plex Sans', system-ui, -apple-system, sans-serif",
  fontMono: "'IBM Plex Mono', ui-monospace, monospace",
  textXs: "0.75rem",
  textSm: "0.8125rem",
  textBase: "0.9375rem",
  textLg: "1.0625rem",
  textXl: "1.375rem",
  text2xl: "1.875rem",
  text3xl: "2.75rem",
  text4xl: "4rem",
  leadingTight: "1.1",
  leadingNormal: "1.65",
  navW: "280px",
  pageGap: "min(6vw, 88px)",
  pageW: "832px",
  columnEnd: "calc(var(--nav-w) + var(--page-gap) + var(--page-w))",
  space1: "0.25rem",
  space2: "0.5rem",
  space3: "0.75rem",
  space4: "1rem",
  space5: "1.25rem",
  space6: "1.5rem",
  space8: "2rem",
  space10: "2.5rem",
  space12: "3rem",
  space16: "4rem",
  sidebarWidth: "272px",
  contentMax: "780px",
  railWidth: "40px",
  punchSize: "7px",
  punchGap: "5px",
  radiusSm: "2px",
  radiusMd: "3px",
  radiusLg: "4px",
  radiusXl: "4px",
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
  bgBase: "#14140f",
  bgSurface: "#100f0b",
  bgRaised: "#1c1c15",
  bgHover: "#24241b",
  bgActive: "#24241b",
  borderSubtle: "#33322a",
  borderMuted: "#4a4839",
  surface: "#1c1c15",
  surface2: "#1c1c15",
  surface3: "#24241b",
  border: "#33322a",
  text: "#e6e1d3",
  accent: "#c4472f",
  accentDim: "#8f3423",
  accentGlow: "rgba(196, 71, 47, 0.10)",
  rose: "#c4472f",
  emerald: "#7f9c5a",
  amber: "#c99a3d",
  cyan: "#6b8cae",
});
