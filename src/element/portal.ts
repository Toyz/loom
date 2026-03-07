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

import { CONNECT_HOOKS, createSymbol } from "../decorators/symbols";
import { morph } from "../morph";
import type { Schedulable } from "./element";

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
            const hooks = CONNECT_HOOKS.from(self) as Array<(el: object) => (() => void) | void> | undefined;

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

                // Patch scheduleUpdate to also re-render portals
                const origSchedule = host.scheduleUpdate;
                if (origSchedule && !(host as any).__portalPatched) {
                    (host as any).__portalPatched = true;
                    const origFlush = (host as any)._flushUpdate as (() => void) | undefined;

                    if (origFlush) {
                        const boundHost = host;
                        (host as any)._flushUpdate = function () {
                            origFlush.call(boundHost);
                            // After main update, re-render all portal content
                            const entries = boundHost[PORTAL_ENTRIES.key] as PortalEntry[] | undefined;
                            if (entries) {
                                for (const entry of entries) {
                                    if (entry.container) renderPortal(boundHost, entry);
                                }
                            }
                        };
                    }
                }

                return () => {
                    // Cleanup: remove all portal containers
                    for (const entry of portalEntries) {
                        if (entry.container) {
                            entry.container.remove();
                            entry.container = null;
                        }
                    }
                    (host as any).__portalPatched = false;
                };
            };

            if (!hooks) CONNECT_HOOKS.set(self, [hook]);
            else hooks.push(hook);
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
