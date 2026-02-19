/**
 * Docs — shared scrollbar stylesheet
 *
 * Shadow DOM blocks global CSS, so any component that scrolls
 * needs to adopt this sheet: @styles(myStyles, scrollbar)
 */
import { css } from "@toyz/loom";

export const scrollbar = css`
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-muted, #333); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--text-muted, #666); }
  * { scrollbar-width: thin; scrollbar-color: var(--border-muted, #333) transparent; }
`;
