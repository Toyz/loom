/**
 * Loom — @clipboard decorator
 *
 * Method decorator for declarative clipboard read/write.
 *
 * ```ts
 * // Write: method returns the text to copy
 * @clipboard("write")
 * copyLink() { return this.shareUrl; }
 *
 * // Read: method receives pasted text as argument
 * @clipboard("read")
 * onPaste(text: string) { this.content = text; }
 * ```
 */

import { CONNECT_HOOKS } from "../decorators/symbols";

type ClipboardMode = "read" | "write";

/**
 * @clipboard(mode) — Method decorator
 *
 * - `"write"`: Calling the method copies its return value to the clipboard.
 * - `"read"`: Binds a `paste` event listener; the method receives the pasted text.
 */
export function clipboard(mode: ClipboardMode) {
  return function (method: Function, context: ClassMethodDecoratorContext) {
    if (mode === "write") {
      // Wrap the method — calling it copies its return value
      return function (this: any, ...args: unknown[]) {
        const text = method.call(this, ...args);
        if (text != null && navigator.clipboard) {
          navigator.clipboard.writeText(String(text)).catch(() => {
            // Fallback: legacy execCommand
            const ta = document.createElement("textarea");
            ta.value = String(text);
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
          });
        }
        return text;
      };
    }

    // mode === "read" — listen for paste events on the element
    context.addInitializer(function (this: any) {
      if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];

      this[CONNECT_HOOKS.key].push((el: HTMLElement) => {
        const handler = (e: ClipboardEvent) => {
          const text = e.clipboardData?.getData("text/plain") ?? "";
          method.call(el, text, e);
        };

        el.addEventListener("paste", handler);
        return () => el.removeEventListener("paste", handler);
      });
    });
  };
}
