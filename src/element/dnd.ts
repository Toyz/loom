/**
 * Loom — @draggable / @dropzone decorators
 *
 * Declarative HTML5 Drag and Drop API wrappers.
 *
 * ```ts
 * // Make the component draggable — serializes data for transfer
 * @draggable({ type: "card" })
 * getDragData() { return JSON.stringify({ id: this.cardId }); }
 *
 * // Accept drops — receives transferred data
 * @dropzone({ accept: "card" })
 * onDrop(data: string) { this.items.push(JSON.parse(data)); }
 *
 * // With JSX overlay during drag-over
 * @dropzone({ accept: "card", over: () => <div class="drop-hint">Drop here!</div> })
 * onDrop(data: string) { ... }
 * ```
 */

import { CONNECT_HOOKS } from "../decorators/symbols";

export interface DraggableOptions {
  /** MIME-like type key for dataTransfer, default "text/plain" */
  type?: string;
  /** Drag effect, default "move" */
  effect?: DataTransfer["effectAllowed"];
  /**
   * CSS selector for child elements to make draggable.
   * Enables event delegation — the matched element is passed
   * as the first argument to the decorated method.
   */
  selector?: string;
}

export interface DropzoneOptions {
  /** MIME-like type key to accept, default "text/plain" */
  accept?: string;
  /** Drop effect, default "move" */
  effect?: DataTransfer["dropEffect"];
  /** CSS class to add when dragging over, default "drag-over" */
  overClass?: string;
  /**
   * CSS selector for child drop targets.
   * Enables event delegation — the matched element is passed
   * as the third argument to the decorated method.
   */
  selector?: string;
  /**
   * Optional JSX overlay rendered into the element's shadow DOM (or light DOM)
   * during dragover. Removed on dragleave/drop. Accepts a function that returns
   * a DOM node (JSX), or a string that creates a simple text overlay.
   */
  over?: (() => Node | string) | string;
}

/**
 * @draggable(opts?) — Method decorator
 *
 * Makes the host element draggable. The decorated method returns the drag
 * data string. Sets `draggable="true"`, wires `dragstart`/`dragend` events.
 */
export function draggable(opts?: DraggableOptions) {
  const mimeType = opts?.type ?? "text/plain";
  const effect = opts?.effect ?? "move";
  const selector = opts?.selector;

  return function (method: Function, context: ClassMethodDecoratorContext) {
    context.addInitializer(function (this: any) {
      if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];

      this[CONNECT_HOOKS.key].push((el: HTMLElement) => {
        if (!selector) {
          // Host-level draggable (original behavior)
          el.draggable = true;

          const onStart = (e: DragEvent) => {
            const data = method.call(el);
            e.dataTransfer?.setData(mimeType, String(data ?? ""));
            if (e.dataTransfer) e.dataTransfer.effectAllowed = effect;
            el.classList.add("dragging");
          };

          const onEnd = () => {
            el.classList.remove("dragging");
          };

          el.addEventListener("dragstart", onStart);
          el.addEventListener("dragend", onEnd);

          return () => {
            el.removeEventListener("dragstart", onStart);
            el.removeEventListener("dragend", onEnd);
            el.draggable = false;
          };
        }

        // Selector-based: event delegation on child elements
        const root = el.shadowRoot ?? el;

        // Mark matching children as draggable
        const markDraggable = () => {
          const targets = root.querySelectorAll(selector);
          for (const t of targets) {
            if (!(t as HTMLElement).draggable) (t as HTMLElement).draggable = true;
          }
        };
        markDraggable();

        // Re-mark after DOM updates — debounce so morph cycles coalesce
        let markScheduled = false;
        const debouncedMark = () => {
          if (markScheduled) return;
          markScheduled = true;
          queueMicrotask(() => {
            markScheduled = false;
            markDraggable();
          });
        };
        const observer = new MutationObserver(debouncedMark);
        observer.observe(root, {
          childList: true,
          subtree: true,
          // Morph patches keyed elements in-place — when it removes the
          // `draggable` attribute, the observer must fire to re-mark.
          attributes: true,
          attributeFilter: ["draggable"],
        });

        const onStart = (e: DragEvent) => {
          const target = (e.target as HTMLElement)?.closest?.(selector);
          if (!target) return;
          const data = method.call(el, target);
          e.dataTransfer?.setData(mimeType, String(data ?? ""));
          if (e.dataTransfer) e.dataTransfer.effectAllowed = effect;
          target.classList.add("dragging");
        };

        const onEnd = (e: DragEvent) => {
          const target = (e.target as HTMLElement)?.closest?.(selector);
          if (target) target.classList.remove("dragging");
        };

        root.addEventListener("dragstart", onStart as EventListener);
        root.addEventListener("dragend", onEnd as EventListener);

        return () => {
          root.removeEventListener("dragstart", onStart as EventListener);
          root.removeEventListener("dragend", onEnd as EventListener);
          observer.disconnect();
        };
      });
    });
  };
}

/**
 * @dropzone(opts?) — Method decorator
 *
 * Makes the host element a drop target. The decorated method receives
 * the transferred data string and the DragEvent. Wires `dragover`,
 * `dragleave`, `drop` events with proper `preventDefault()`.
 *
 * When `opts.over` is provided, a JSX overlay is rendered into the
 * element during dragover and removed on dragleave/drop.
 */
export function dropzone(opts?: DropzoneOptions) {
  const mimeType = opts?.accept ?? "text/plain";
  const dropEffect = opts?.effect ?? "move";
  const overClass = opts?.overClass ?? "drag-over";
  const overFn = opts?.over;
  const selector = opts?.selector;

  return function (method: Function, context: ClassMethodDecoratorContext) {
    context.addInitializer(function (this: any) {
      if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];

      this[CONNECT_HOOKS.key].push((el: HTMLElement) => {
        let overlayEl: Node | null = null;

        const showOverlay = () => {
          if (!overFn || overlayEl) return;
          const content = typeof overFn === "function" ? overFn() : overFn;
          if (content instanceof Node) {
            overlayEl = content;
          } else {
            const div = document.createElement("div");
            div.setAttribute("data-loom-dropzone-overlay", "");
            div.textContent = String(content);
            overlayEl = div;
          }
          // Append to shadow root if available, otherwise light DOM
          const root = el.shadowRoot ?? el;
          root.appendChild(overlayEl);
        };

        const hideOverlay = () => {
          if (overlayEl) {
            overlayEl.parentNode?.removeChild(overlayEl);
            overlayEl = null;
          }
        };

        if (!selector) {
          // Host-level dropzone (original behavior)
          const onOver = (e: DragEvent) => {
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = dropEffect;
            el.classList.add(overClass);
            showOverlay();
          };

          const onLeave = () => {
            el.classList.remove(overClass);
            hideOverlay();
          };

          const onDrop = (e: DragEvent) => {
            e.preventDefault();
            el.classList.remove(overClass);
            hideOverlay();
            const data = e.dataTransfer?.getData(mimeType) ?? "";
            method.call(el, data, e);
          };

          el.addEventListener("dragover", onOver);
          el.addEventListener("dragleave", onLeave);
          el.addEventListener("drop", onDrop);

          return () => {
            el.removeEventListener("dragover", onOver);
            el.removeEventListener("dragleave", onLeave);
            el.removeEventListener("drop", onDrop);
            hideOverlay();
          };
        }

        // Selector-based: event delegation on child elements
        const root = el.shadowRoot ?? el;
        let currentOverTarget: HTMLElement | null = null;

        const onOver = (e: DragEvent) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = dropEffect;
          const target = (e.target as HTMLElement)?.closest?.(selector) as HTMLElement | null;
          if (target && target !== currentOverTarget) {
            currentOverTarget?.classList.remove(overClass);
            target.classList.add(overClass);
            currentOverTarget = target;
          }
        };

        const onLeave = (e: DragEvent) => {
          const target = (e.target as HTMLElement)?.closest?.(selector) as HTMLElement | null;
          // Only clear when actually leaving the matched element, not moving to a child.
          // dragleave fires on every child crossing — relatedTarget is still inside target in that case.
          if (target && !target.contains(e.relatedTarget as Node | null)) {
            target.classList.remove(overClass);
            if (target === currentOverTarget) currentOverTarget = null;
          }
        };

        const onDrop = (e: DragEvent) => {
          e.preventDefault();
          const target = (e.target as HTMLElement)?.closest?.(selector) as HTMLElement | null;
          if (currentOverTarget) currentOverTarget.classList.remove(overClass);
          currentOverTarget = null;
          const data = e.dataTransfer?.getData(mimeType) ?? "";
          method.call(el, data, e, target);
        };

        root.addEventListener("dragover", onOver as EventListener);
        root.addEventListener("dragleave", onLeave as EventListener);
        root.addEventListener("drop", onDrop as EventListener);

        return () => {
          root.removeEventListener("dragover", onOver as EventListener);
          root.removeEventListener("dragleave", onLeave as EventListener);
          root.removeEventListener("drop", onDrop as EventListener);
          hideOverlay();
        };
      });
    });
  };
}
