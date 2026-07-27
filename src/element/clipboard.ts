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

import { addConnectHook, hostElement } from "../decorators/symbols.js";

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

      addConnectHook(this, (host: HTMLElement) => {
        // A LoomAttribute controller is not itself an element — listen on the
        // element it wraps, but keep `this` binding on the raw host.
        const dom = hostElement(host);
        const handler = (e: ClipboardEvent) => {
          const text = e.clipboardData?.getData("text/plain") ?? "";
          method.call(host, text, e);
        };

        dom.addEventListener("paste", handler);
        return () => dom.removeEventListener("paste", handler);
      });
    });
  };
}
