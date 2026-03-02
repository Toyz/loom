/**
 * Loom — @log decorator + LogTransport (TC39 Stage 3)
 *
 * Pluggable structured logging for Loom components.
 * Same transport pattern as RpcTransport in loom-rpc.
 *
 * ```ts
 * // Register a transport
 * app.use(LogTransport, new ConsoleTransport());
 *
 * // Decorate methods
 * @log
 * open() { this.isOpen = true; }
 *
 * @log("warn")
 * dangerousAction() { ... }
 *
 * @log({ level: "debug", label: "Search" })
 * onInput(e: Event) { ... }
 * ```
 */

import { app } from "../app";

// ── Types ──

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
    /** Log severity */
    level: LogLevel;
    /** Component tag name (e.g. "doc-search") */
    component: string;
    /** Method name that was called */
    method: string;
    /** Custom label (from options) */
    label?: string;
    /** Arguments passed to the method */
    args: unknown[];
    /** Return value (sync methods only — async resolves before logging) */
    result?: unknown;
    /** Error thrown by the method */
    error?: Error;
    /** Execution time in milliseconds */
    duration: number;
    /** Timestamp (Date.now()) */
    timestamp: number;
}

export interface LogOptions {
    /** Log level (default: "info") */
    level?: LogLevel;
    /** Custom label shown in log output */
    label?: string;
    /** Include method arguments in the log entry (default: true) */
    includeArgs?: boolean;
    /**
     * Selectively redact args. Supports:
     *  - `[0, 2]` — fully redact args at those indices
     *  - `{ 0: ["password", "token"] }` — redact nested keys in object arg at index 0
     *  - `{ 0: true }` — fully redact arg at index 0
     *  - `{ 1: ["user.email", "user.ssn"] }` — dot-path for nested objects
     */
    skipArgs?: number[] | Record<number, true | string[]>;
}

// ── Transport ──

/**
 * Abstract log transport — implement this to control where logs go.
 *
 * Registered as a DI service via `app.use(LogTransport, impl)`.
 *
 * ```ts
 * app.use(LogTransport, new ConsoleTransport());
 * ```
 */
export abstract class LogTransport {
    abstract send(entry: LogEntry): void;
}

/**
 * Default console transport — styled, color-coded output.
 *
 * ```ts
 * app.use(LogTransport, new ConsoleTransport());
 * ```
 */
export class ConsoleTransport extends LogTransport {
    send(entry: LogEntry): void {
        const tag = entry.label
            ? `[${entry.component}:${entry.label}]`
            : `[${entry.component}]`;

        const parts: unknown[] = [
            `${tag} ${entry.method}()`,
        ];

        if (entry.args.length > 0) parts.push("args:", entry.args);
        if (entry.error) parts.push("error:", entry.error);
        else if (entry.result !== undefined) parts.push("→", entry.result);
        parts.push(`(${entry.duration.toFixed(1)}ms)`);

        console[entry.level](...parts);
    }
}

// ── Cached transport resolution ──

let _transport: LogTransport | null | false = false; // false = unchecked

function getTransport(): LogTransport | null {
    if (_transport === false) {
        const result = app.maybe<LogTransport>(LogTransport);
        _transport = result.ok ? result.unwrap() : null;
    }
    return _transport;
}

/** Reset cached transport (for testing or hot-reload) */
export function resetLogTransport(): void {
    _transport = false;
}

// ── Decorator ──

/**
 * @log — Structured method logging via pluggable LogTransport.
 *
 * Wraps the decorated method to capture args, return value, errors,
 * and execution duration. Sends a LogEntry through the registered
 * LogTransport. No-op if no transport is registered.
 *
 * Supports sync and async methods — async methods log after resolution.
 *
 * ```ts
 * @log                          // level: "info"
 * open() { ... }
 *
 * @log("warn")                  // level shorthand
 * danger() { ... }
 *
 * @log({ level: "debug" })      // full options
 * tick() { ... }
 * ```
 */
export function log(
    method: Function,
    context: ClassMethodDecoratorContext,
): void;
export function log(
    level: LogLevel,
): (method: Function, context: ClassMethodDecoratorContext) => void;
export function log(
    options: LogOptions,
): (method: Function, context: ClassMethodDecoratorContext) => void;
export function log(
    methodOrLevelOrOpts: Function | LogLevel | LogOptions,
    context?: ClassMethodDecoratorContext,
): void | ((method: Function, context: ClassMethodDecoratorContext) => void) {
    // Direct decoration: @log (no parentheses)
    if (typeof methodOrLevelOrOpts === "function" && context) {
        return applyLog(methodOrLevelOrOpts, context, {});
    }

    // Called with args: @log("warn") or @log({ level, label })
    const opts: LogOptions =
        typeof methodOrLevelOrOpts === "string"
            ? { level: methodOrLevelOrOpts }
            : (methodOrLevelOrOpts as LogOptions);

    return (method: Function, ctx: ClassMethodDecoratorContext) => {
        return applyLog(method, ctx, opts);
    };
}

// ── Arg sanitization ──

const REDACTED = "[redacted]";

function sanitizeArgs(
    args: unknown[],
    includeArgs: boolean,
    skipArgs?: number[] | Record<number, true | string[]>,
): unknown[] {
    if (!includeArgs) return [];
    if (!skipArgs) return args;

    // Array form: [0, 2] — fully redact those indices
    if (Array.isArray(skipArgs)) {
        return args.map((arg, i) => skipArgs.includes(i) ? REDACTED : arg);
    }

    // Record form: { 0: true, 1: ["password", "user.email"] }
    return args.map((arg, i) => {
        const rule = skipArgs[i];
        if (rule === undefined) return arg;
        if (rule === true) return REDACTED;
        // rule is string[] — redact nested keys from a cloned object
        if (typeof arg !== "object" || arg === null) return arg;
        const clone = deepClone(arg);
        for (const path of rule) {
            redactPath(clone as Record<string, unknown>, path);
        }
        return clone;
    });
}

function deepClone(obj: unknown): unknown {
    if (typeof obj !== "object" || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(deepClone);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj as Record<string, unknown>)) {
        out[k] = deepClone((obj as Record<string, unknown>)[k]);
    }
    return out;
}

function redactPath(obj: Record<string, unknown>, path: string): void {
    const parts = path.split(".");
    let target: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        target = target?.[parts[i]];
        if (typeof target !== "object" || target === null) return;
    }
    const last = parts[parts.length - 1];
    if (target && last in target) {
        target[last] = REDACTED;
    }
}

function applyLog(
    method: Function,
    context: ClassMethodDecoratorContext,
    opts: LogOptions,
): void {
    const methodName = String(context.name);
    const level = opts.level ?? "info";
    const label = opts.label;
    const includeArgs = opts.includeArgs !== false;
    const skipArgs = opts.skipArgs;

    // Replace the method on the prototype via addInitializer
    context.addInitializer(function (this: any) {
        const original = this[methodName].bind(this);
        const component =
            (this as HTMLElement).tagName?.toLowerCase() ?? "unknown";

        this[methodName] = function (...args: unknown[]) {
            const transport = getTransport();
            if (!transport) return original(...args);

            const start = performance.now();
            const timestamp = Date.now();

            let result: unknown;
            try {
                result = original(...args);
            } catch (err) {
                const duration = performance.now() - start;
                transport.send({
                    level: "error",
                    component,
                    method: methodName,
                    label,
                    args: sanitizeArgs(args, includeArgs, skipArgs),
                    error: err instanceof Error ? err : new Error(String(err)),
                    duration,
                    timestamp,
                });
                throw err;
            }

            // Async support — log after promise resolves/rejects
            if (result instanceof Promise) {
                return result.then(
                    (resolved) => {
                        const duration = performance.now() - start;
                        transport.send({
                            level,
                            component,
                            method: methodName,
                            label,
                            args: sanitizeArgs(args, includeArgs, skipArgs),
                            result: resolved,
                            duration,
                            timestamp,
                        });
                        return resolved;
                    },
                    (err) => {
                        const duration = performance.now() - start;
                        transport.send({
                            level: "error",
                            component,
                            method: methodName,
                            label,
                            args: sanitizeArgs(args, includeArgs, skipArgs),
                            error: err instanceof Error ? err : new Error(String(err)),
                            duration,
                            timestamp,
                        });
                        throw err;
                    },
                );
            }

            // Sync — log immediately
            const duration = performance.now() - start;
            transport.send({
                level,
                component,
                method: methodName,
                label,
                args: sanitizeArgs(args, includeArgs, skipArgs),
                result,
                duration,
                timestamp,
            });

            return result;
        };
    });
}
