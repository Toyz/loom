/**
 * Shared icon color palette.
 * Used by sidebar (via CSS nth-child) and doc-header (via index lookup).
 * 10 colors cycling through golden-angle hue steps — adjacent items never clash.
 */
export const ICON_COLORS = [
  "hsl(260, 70%, 70%)",   // 1 — violet
  "hsl(330, 65%, 68%)",   // 2 — pink
  "hsl(170, 60%, 60%)",   // 3 — teal
  "hsl(35,  70%, 65%)",   // 4 — amber
  "hsl(200, 65%, 65%)",   // 5 — sky
  "hsl(290, 55%, 68%)",   // 6 — purple
  "hsl(140, 55%, 60%)",   // 7 — green
  "hsl(15,  70%, 65%)",   // 8 — coral
  "hsl(55,  65%, 60%)",   // 9 — gold
  "hsl(220, 65%, 70%)",   // 10 — blue
] as const;
