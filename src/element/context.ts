/**
 * Loom — @provide / @consume context (TC39 Stage 3)
 *
 * Cross-shadow-DOM data sharing using the W3C Context Protocol.
 * Class-based keys (like @service), auto-instantiation, reactive updates.
 *
 * ```ts
 * class ThemeContext {
 *   mode: "dark" | "light" = "dark";
 *   primary = "#818cf8";
 * }
 *
 * // Provider (ancestor)
 * @provide(ThemeContext) accessor theme!: ThemeContext;
 *
 * // Consumer (any descendant — crosses shadow boundaries)
 * @consume(ThemeContext) accessor theme!: ThemeContext;
 * ```
 */

import { CONNECT_HOOKS, localSymbol } from "../decorators/symbols";
import type { Schedulable } from "./element";

// ── Context Request Event ──

const CONTEXT_REQUEST = "context-request";

/**
 * W3C Context Protocol event.
 * Dispatched by consumers, intercepted by providers.
 *
 * `composed: true` lets it cross shadow DOM boundaries.
 */
export class ContextRequestEvent<T = unknown> extends Event {
    constructor(
        /** The context key (class constructor, string, or symbol) */
        public readonly context: unknown,
        /** Callback the provider calls with the current value */
        public readonly callback: ContextCallback<T>,
        /** Whether to subscribe to future updates (default: true) */
        public readonly subscribe: boolean = true,
    ) {
        super(CONTEXT_REQUEST, { bubbles: true, composed: true });
    }
}

export type ContextCallback<T> = (value: T, unsubscribe: () => void) => void;

// ── @provide ──

/**
 * @provide(Key) — Provide a context value to descendants.
 *
 * If Key is a class constructor and no initial value is set,
 * the decorator auto-instantiates via `new Key()`.
 *
 * ```ts
 * @provide(ThemeContext) accessor theme!: ThemeContext;
 * ```
 */
export function provide<T>(key: (new () => T) | string | symbol) {
    return <This extends object>(
        target: ClassAccessorDecoratorTarget<This, T>,
        context: ClassAccessorDecoratorContext<This, T>,
    ): ClassAccessorDecoratorResult<This, T> => {
        const storage = localSymbol<T>(`ctx:provide:${String(context.name)}`);
        const subs_ = localSymbol<Set<ContextCallback<T>>>(`ctx:subs:${String(context.name)}`);

        context.addInitializer(function () {
            const self = this as object;
            const hooks = CONNECT_HOOKS.from(self) as Array<(el: object) => (() => void) | void> | undefined;

            const hook = (el: object) => {
                const host = el as HTMLElement & Schedulable & Record<symbol, unknown>;

                // Auto-instantiate class key if no value set
                if (host[storage.key] === undefined && typeof key === "function") {
                    host[storage.key] = new (key as new () => T)();
                }

                // Subscriber list for reactive updates
                if (!host[subs_.key]) host[subs_.key] = new Set<ContextCallback<T>>();
                const subs = host[subs_.key] as Set<ContextCallback<T>>;

                // Listen for context requests from descendants
                const handler = (e: Event) => {
                    const req = e as ContextRequestEvent<T>;
                    if (req.context !== key) return;

                    // Stop propagation so nearest provider wins
                    e.stopPropagation();

                    const currentValue = host[storage.key] as T;

                    if (req.subscribe) {
                        // Subscriber — store callback for future updates
                        const cb = req.callback;
                        subs.add(cb);

                        // Provide unsubscribe function
                        const unsub = () => subs.delete(cb);
                        cb(currentValue, unsub);
                    } else {
                        // One-shot read
                        req.callback(currentValue, () => { });
                    }
                };

                (host as HTMLElement).addEventListener(CONTEXT_REQUEST, handler);

                return () => {
                    (host as HTMLElement).removeEventListener(CONTEXT_REQUEST, handler);
                    // Notify consumers this provider is gone so they can
                    // re-request from a higher ancestor provider.
                    for (const cb of [...subs]) {
                        cb(undefined as T, () => { });
                    }
                    subs.clear();
                };
            };

            if (!hooks) CONNECT_HOOKS.set(self, [hook]);
            else hooks.push(hook);
        });

        return {
            init(this: This, value: T): T {
                // Capture initial accessor value into our storage
                (this as unknown as Record<symbol, unknown>)[storage.key] = value;
                return value;
            },
            get(this: This): T {
                const self = this as unknown as Record<symbol, unknown>;
                if (self[storage.key] === undefined && typeof key === "function") {
                    self[storage.key] = new (key as new () => T)();
                }
                return self[storage.key] as T;
            },
            set(this: This, value: T) {
                const self = this as unknown as Record<symbol, unknown>;
                self[storage.key] = value;

                // Notify all subscribed consumers (snapshot to guard
                // against mid-callback unsubscribes mutating the Set)
                const subs = self[subs_.key] as Set<ContextCallback<T>> | undefined;
                if (subs) {
                    for (const cb of [...subs]) {
                        cb(value, () => subs.delete(cb));
                    }
                }

                // Schedule re-render
                (self as unknown as Schedulable).scheduleUpdate?.();
            },
        };
    };
}

// ── @consume ──

/**
 * @consume(Key) — Consume a context value from the nearest provider ancestor.
 *
 * The accessor is automatically typed from the Key if it's a class constructor.
 * Updates reactively when the provider changes the value.
 *
 * ```ts
 * @consume(ThemeContext) accessor theme!: ThemeContext;
 * ```
 */
export function consume<T>(key: (new () => T) | string | symbol) {
    return <This extends object>(
        _target: ClassAccessorDecoratorTarget<This, T>,
        context: ClassAccessorDecoratorContext<This, T>,
    ): ClassAccessorDecoratorResult<This, T> => {
        const storage = localSymbol<T>(`ctx:consume:${String(context.name)}`);
        const unsub_ = localSymbol<() => void>(`ctx:unsub:${String(context.name)}`);

        context.addInitializer(function () {
            const self = this as object;
            const hooks = CONNECT_HOOKS.from(self) as Array<(el: object) => (() => void) | void> | undefined;

            const hook = (el: object) => {
                const host = el as HTMLElement & Schedulable & Record<symbol, unknown>;

                // Callback from provider — also handles provider disconnect:
                // when a provider is removed it sends undefined, so the
                // consumer re-dispatches to find a higher ancestor provider.
                const callback: ContextCallback<T> = (value, unsubscribe) => {
                    const wasConnected = host[unsub_.key] !== undefined;
                    host[storage.key] = value;
                    host[unsub_.key] = unsubscribe;
                    host.scheduleUpdate?.();

                    // Provider disconnected — try to find a higher one
                    if (value === undefined && wasConnected) {
                        queueMicrotask(() => {
                            if (host.isConnected) {
                                host.dispatchEvent(
                                    new ContextRequestEvent<T>(key, callback, true),
                                );
                            }
                        });
                    }
                };

                // Defer dispatch so ancestor providers are connected first.
                // Same pattern @slot uses — parent connectedCallback may not
                // have fired yet when both connect in the same tick.
                queueMicrotask(() => {
                    host.dispatchEvent(
                        new ContextRequestEvent<T>(key, callback, true),
                    );
                });

                return () => {
                    // Unsubscribe from provider on disconnect
                    const unsub = host[unsub_.key] as (() => void) | undefined;
                    unsub?.();
                    host[unsub_.key] = undefined;
                };
            };

            if (!hooks) CONNECT_HOOKS.set(self, [hook]);
            else hooks.push(hook);
        });

        return {
            get(this: This): T {
                return (this as unknown as Record<symbol, unknown>)[storage.key] as T;
            },
            set(this: This, value: T) {
                (this as unknown as Record<symbol, unknown>)[storage.key] = value;
            },
        };
    };
}
