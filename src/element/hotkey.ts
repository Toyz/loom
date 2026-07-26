/**
 * Loom — @hotkey decorator (TC39 Stage 3)
 *
 * Declarative keyboard shortcut binding with auto-cleanup.
 * Listens on the element by default, or globally on `document`.
 *
 * ```ts
 * @hotkey("ctrl+k")
 * openSearch() { this.searchOpen = true; }
 *
 * @hotkey("ctrl+s", "cmd+s")
 * save() { this.persist(); }
 *
 * @hotkey("escape", { global: true })
 * closeModal() { this.modalOpen = false; }
 * ```
 */

import { addConnectHook, hostElement } from "../decorators/symbols";

// ── Types ──

export interface HotkeyOptions {
    /** Listen on document instead of the element (default: false) */
    global?: boolean;
    /** Prevent default browser behavior (default: true) */
    preventDefault?: boolean;
}

/**
 * Object-based key combo definition.
 *
 * ```ts
 * @hotkey({ key: "k", mod: true })
 * @hotkey({ key: "s", ctrl: true, shift: true })
 * ```
 */
export interface HotkeyCombo {
    /** The key to listen for (e.g. "k", "escape", "enter") */
    key: string;
    /** Require Ctrl (default: false) */
    ctrl?: boolean;
    /** Require Shift (default: false) */
    shift?: boolean;
    /** Require Alt/Option (default: false) */
    alt?: boolean;
    /** Require Meta/Cmd/Win (default: false) */
    meta?: boolean;
    /** Cross-platform: Meta on Mac, Ctrl elsewhere (default: false) */
    mod?: boolean;
    /** Listen on document instead of the element */
    global?: boolean;
    /** Prevent default browser behavior */
    preventDefault?: boolean;
}

interface ParsedCombo {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
    key: string;
}

// ── Combo Parser (cached) ──

const _comboCache = new Map<string, ParsedCombo>();

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform ?? "");

function parseCombo(raw: string): ParsedCombo {
    let cached = _comboCache.get(raw);
    if (cached) return cached;

    let ctrl = false, shift = false, alt = false, meta = false;
    let key = "";

    const parts = raw.toLowerCase().split("+");
    for (const part of parts) {
        switch (part) {
            case "ctrl":
            case "control":
                ctrl = true;
                break;
            case "shift":
                shift = true;
                break;
            case "alt":
            case "option":
                alt = true;
                break;
            case "meta":
            case "cmd":
            case "command":
            case "win":
                meta = true;
                break;
            case "mod":
                // mod = cmd on Mac, ctrl elsewhere
                if (isMac) meta = true;
                else ctrl = true;
                break;
            default:
                key = part;
        }
    }

    cached = { ctrl, shift, alt, meta, key };
    _comboCache.set(raw, cached);
    return cached;
}

function comboFromObject(obj: HotkeyCombo): ParsedCombo {
    let ctrl = obj.ctrl ?? false;
    let meta = obj.meta ?? false;

    if (obj.mod) {
        if (isMac) meta = true;
        else ctrl = true;
    }

    return {
        ctrl,
        shift: obj.shift ?? false,
        alt: obj.alt ?? false,
        meta,
        key: obj.key.toLowerCase(),
    };
}

// ── Display ──

/** Keys whose printed name is not just the key uppercased. */
const KEY_LABELS: Record<string, string> = {
    escape: "Esc",
    arrowup: "↑",
    arrowdown: "↓",
    arrowleft: "←",
    arrowright: "→",
    enter: "↵",
    backspace: "⌫",
    delete: "Del",
    tab: "Tab",
    " ": "Space",
    space: "Space",
};

function keyLabel(key: string): string {
    return KEY_LABELS[key] ?? (key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1));
}

/**
 * Printed form of a combo, in the convention of the platform it is running on.
 *
 * The parser already resolves `mod` to Meta on Mac and Ctrl elsewhere, so this
 * is the same answer the matcher uses — which is the point. Writing the label
 * out by hand means maintaining a second, silently divergent copy of it.
 */
function formatCombo(c: ParsedCombo): string {
    const key = keyLabel(c.key);
    if (isMac) {
        // Apple's documented modifier order, and no separators.
        return `${c.ctrl ? "⌃" : ""}${c.alt ? "⌥" : ""}${c.shift ? "⇧" : ""}${c.meta ? "⌘" : ""}${key}`;
    }
    const parts: string[] = [];
    if (c.ctrl) parts.push("Ctrl");
    if (c.alt) parts.push("Alt");
    if (c.shift) parts.push("Shift");
    if (c.meta) parts.push("Win");
    parts.push(key);
    return parts.join("+");
}

/**
 * A method decorated with `@hotkey` carries its own printed label.
 *
 * ```ts
 * @hotkey("mod+k")
 * openSearch() { ... }
 *
 * // in the template — no hand-typed shortcut hint to keep in sync
 * <kbd>{hotkeyLabel(this.openSearch)}</kbd>
 * ```
 */
export interface HotkeyLabelled {
    /** The first combo, printed for this platform, e.g. "⌘K" or "Ctrl+K". */
    readonly hotkey: string;
    /** Every combo the method is bound to, in declaration order. */
    readonly hotkeys: readonly string[];
}

/**
 * The printed shortcut for a `@hotkey` method, or `""` if it has none.
 *
 * Typed accessor for the label the decorator attaches, so callers do not have
 * to cast the method to reach it.
 */
export function hotkeyLabel(method: unknown): string {
    return (method as Partial<HotkeyLabelled> | undefined)?.hotkey ?? "";
}

/** Every printed shortcut for a `@hotkey` method. */
export function hotkeyLabels(method: unknown): readonly string[] {
    return (method as Partial<HotkeyLabelled> | undefined)?.hotkeys ?? [];
}

function matchesCombo(e: KeyboardEvent, combo: ParsedCombo): boolean {
    return (
        e.ctrlKey === combo.ctrl &&
        e.shiftKey === combo.shift &&
        e.altKey === combo.alt &&
        e.metaKey === combo.meta &&
        e.key.toLowerCase() === combo.key
    );
}

// ── Decorator ──

/**
 * @hotkey — Declarative keyboard shortcut. Auto-cleaned on disconnect.
 *
 * Accepts one or more key combo strings, optionally followed by an options object.
 * Key combos use `+` to join modifiers and key: `ctrl+shift+k`, `cmd+s`, `escape`.
 *
 * Special modifier `mod` maps to `cmd` on Mac, `ctrl` elsewhere.
 *
 * ```ts
 * @hotkey("mod+k")
 * openSearch() { ... }
 *
 * @hotkey("ctrl+s", "cmd+s", { preventDefault: true })
 * save() { ... }
 *
 * @hotkey("escape", { global: true })
 * close() { ... }
 * ```
 */
export function hotkey(
    ...args: [...combos: (string | HotkeyCombo)[], options: HotkeyOptions] | (string | HotkeyCombo)[]
): (method: Function, context: ClassMethodDecoratorContext) => void {
    // Separate combo defs from trailing options object (no .key = pure options)
    let options: HotkeyOptions = {};
    let comboDefs: (string | HotkeyCombo)[];

    const last = args[args.length - 1];
    if (typeof last === "object" && last !== null && !("key" in last)) {
        // Trailing options (no .key property means it's HotkeyOptions, not HotkeyCombo)
        options = last as HotkeyOptions;
        comboDefs = args.slice(0, -1) as (string | HotkeyCombo)[];
    } else {
        comboDefs = args as (string | HotkeyCombo)[];
    }

    const combos: ParsedCombo[] = [];
    let comboGlobal: boolean | undefined;
    let comboPreventDefault: boolean | undefined;

    for (const def of comboDefs) {
        if (typeof def === "string") {
            combos.push(parseCombo(def));
        } else {
            combos.push(comboFromObject(def));
            // Object combos can carry their own global/preventDefault
            if (def.global !== undefined) comboGlobal = def.global;
            if (def.preventDefault !== undefined) comboPreventDefault = def.preventDefault;
        }
    }

    // Object combo settings serve as fallbacks to trailing options
    const preventDefault = options.preventDefault ?? comboPreventDefault ?? true;
    const global = options.global ?? comboGlobal ?? false;

    // Printed once per declaration, not per instance: the combo belongs to the
    // method, so the label lives on the method object. Non-enumerable so it
    // cannot show up in anything that walks the prototype.
    const labels = Object.freeze(combos.map(formatCombo));

    return (method: Function, context: ClassMethodDecoratorContext) => {
        Object.defineProperty(method, "hotkeys", { value: labels, configurable: true });
        Object.defineProperty(method, "hotkey", { value: labels[0] ?? "", configurable: true });

        context.addInitializer(function (this: any) {

            addConnectHook(this, (host: HTMLElement) => {
                // DOM target: the host's element (a LoomAttribute wraps `this.el`).
                // Method binding stays on the raw host for correct `this`.
                const dom = hostElement(host);
                const target: EventTarget = global ? document : dom;

                const handler = (e: Event) => {
                    const ke = e as KeyboardEvent;
                    for (const combo of combos) {
                        if (matchesCombo(ke, combo)) {
                            if (preventDefault) ke.preventDefault();
                            method.call(host, ke);
                            return;
                        }
                    }
                };

                // Elements need tabindex to receive keyboard events
                if (!global && !dom.hasAttribute("tabindex")) {
                    dom.setAttribute("tabindex", "0");
                }

                target.addEventListener("keydown", handler);
                return () => target.removeEventListener("keydown", handler);
            });
        });
    };
}
