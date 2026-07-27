/**
 * Loom — @portal decorator (TC39 Stage 3)
 *
 * Teleport rendered content to an external DOM target (e.g. document.body).
 * Escapes shadow DOM stacking context for modals, tooltips, dropdowns.
 *
 * ```ts
 * @portal("body")
 * renderModal() {
 *   if (!this.open) return null;
 *   return <div class="modal-backdrop"><div class="modal">...</div></div>;
 * }
 * ```
 *
 * The decorated method is called during each update cycle alongside update().
 * The return value is morphed into a portal container at the target.
 * Container and content are auto-removed on disconnect.
 */

import { addConnectHook, createSymbol } from "../decorators/symbols.js";
import { morph } from "../morph.js";
import type { Schedulable } from "./element.js";

// ── Types ──

export interface PortalOptions {
    /** CSS selector or Element to append the portal container to (default: "body") */
    target?: string | Element;
    /** Custom class name(s) for the portal container */
    className?: string;
}

interface PortalEntry {
    method: Function;
    target: string | Element;
    className?: string;
    container: HTMLElement | null;
}

const PORTAL_ENTRIES = createSymbol<PortalEntry[]>("portal:entries");

// ── Decorator ──

/**
 * @portal — Teleport a method's return value to an external DOM target.
 *
 * ```ts
 * @portal("body")
 * renderModal() { return this.open ? <div class="modal">...</div> : null; }
 *
 * @portal({ target: "#tooltips", className: "tooltip-portal" })
 * renderTooltip() { ... }
 * ```
 */
export function portal(
    targetOrOptions?: string | PortalOptions,
): (method: Function, context: ClassMethodDecoratorContext) => void {
    const opts: PortalOptions = typeof targetOrOptions === "string"
        ? { target: targetOrOptions }
        : targetOrOptions ?? {};
    const target = opts.target ?? "body";
    const className = opts.className;

    return (method: Function, context: ClassMethodDecoratorContext) => {
        context.addInitializer(function (this: any) {
            const self = this as object & Record<symbol, unknown>;

            // Register this portal entry on the instance
            if (!self[PORTAL_ENTRIES.key]) self[PORTAL_ENTRIES.key] = [];
            const entries = self[PORTAL_ENTRIES.key] as PortalEntry[];
            entries.push({ method, target, className, container: null });

            // Push a connect hook for lifecycle management

            const hook = (el: object) => {
                const host = el as HTMLElement & Schedulable & Record<symbol, unknown>;
                const portalEntries = host[PORTAL_ENTRIES.key] as PortalEntry[];

                // Create portal containers + wire into update cycle
                for (const entry of portalEntries) {
                    if (entry.container) continue; // already mounted

                    // Resolve target element
                    const targetEl = typeof entry.target === "string"
                        ? document.querySelector(entry.target)
                        : entry.target;
                    if (!targetEl) {
                        console.warn(`[Loom @portal] Target "${entry.target}" not found`);
                        continue;
                    }

                    // Create the portal container with shadow DOM for style isolation
                    const container = document.createElement("div");
                    container.setAttribute("data-loom-portal", "");
                    if (entry.className) container.className = entry.className;
                    targetEl.appendChild(container);
                    entry.container = container;

                    // Initial render
                    renderPortal(host, entry);
                }

                // Re-render portals after every render pass.
                //
                // This used to monkey-patch host._flushUpdate, and the cleanup
                // only reset a __portalPatched boolean without restoring the
                // original — so each disconnect/reconnect wrapped the wrapper
                // and the portal re-rendered N times per update after N moves.
                const afterUpdate = () => {
                    const entries = host[PORTAL_ENTRIES.key] as PortalEntry[] | undefined;
                    if (!entries) return;
                    for (const entry of entries) {
                        if (entry.container) renderPortal(host, entry);
                    }
                };
                const hooks = ((host as any).__afterUpdate ??= []) as Array<() => void>;
                hooks.push(afterUpdate);

                return () => {
                    // Cleanup: remove all portal containers
                    for (const entry of portalEntries) {
                        if (entry.container) {
                            entry.container.remove();
                            entry.container = null;
                        }
                    }
                    const idx = hooks.indexOf(afterUpdate);
                    if (idx >= 0) hooks.splice(idx, 1);
                };
            };

            addConnectHook(self, hook);
        });
    };
}

// ── Portal Rendering ──

function renderPortal(host: object, entry: PortalEntry): void {
    const container = entry.container;
    if (!container) return;

    const result = entry.method.call(host);

    if (result == null || result === false) {
        // null/undefined/false → clear portal content
        container.innerHTML = "";
        return;
    }

    if (Array.isArray(result)) {
        // Multiple nodes — morph against existing children
        const frag = document.createDocumentFragment();
        for (let i = 0; i < result.length; i++) {
            const node = result[i];
            if (node != null) frag.appendChild(node instanceof Node ? node : document.createTextNode(String(node)));
        }
        morph(container, frag);
    } else if (result instanceof Node) {
        morph(container, result);
    } else {
        // Primitive — render as text
        const textNode = document.createTextNode(String(result));
        morph(container, textNode);
    }
}
