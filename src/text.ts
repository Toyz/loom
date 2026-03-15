/**
 * Loom — text() HTML entity decoder
 *
 * Decodes common HTML entities back to their literal characters.
 * Zero DOM allocation — pure regex replacement.
 *
 * Use in JSX when rendering server-escaped strings:
 *
 * ```tsx
 * import { text } from "@toyz/loom";
 *
 * update() {
 *   return <p>{text("tea time &lt;3")}</p>;
 *   // Renders: tea time <3
 * }
 * ```
 */

const entities: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&#x2F;": "/",
  "&#x60;": "`",
};

const entityPattern = /&(?:amp|lt|gt|quot|#39|#x27|#x2F|#x60);/g;

/**
 * Decode HTML entities in a string.
 *
 * Safe to use in JSX — returns a plain string that will be
 * inserted as a text node (no HTML parsing, no XSS risk).
 *
 * Handles: `&amp;` `&lt;` `&gt;` `&quot;` `&#39;` `&#x27;` `&#x2F;` `&#x60;`
 */
export function text(escaped: string): string {
  return escaped.replace(entityPattern, (m) => entities[m]);
}
