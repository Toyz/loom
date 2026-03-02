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

import { CONNECT_HOOKS } from "../decorators/symbols";

// ── Types ──

export interface HotkeyOptions {
    /** Listen on document instead of the element (default: false) */
    global?: boolean;
    /** Prevent default browser behavior (default: true) */
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
    ...args: [...combos: string[], options: HotkeyOptions] | string[]
): (method: Function, context: ClassMethodDecoratorContext) => void {
    // Separate combo strings from trailing options object
    let options: HotkeyOptions = {};
    let comboStrings: string[];

    const last = args[args.length - 1];
    if (typeof last === "object" && last !== null) {
        options = last as HotkeyOptions;
        comboStrings = args.slice(0, -1) as string[];
    } else {
        comboStrings = args as string[];
    }

    const combos = comboStrings.map(parseCombo);
    const preventDefault = options.preventDefault ?? true;
    const global = options.global ?? false;

    return (method: Function, context: ClassMethodDecoratorContext) => {
        context.addInitializer(function (this: any) {
            if (!this[CONNECT_HOOKS.key]) this[CONNECT_HOOKS.key] = [];

            this[CONNECT_HOOKS.key].push((el: HTMLElement) => {
                const target: EventTarget = global ? document : el;

                const handler = (e: Event) => {
                    const ke = e as KeyboardEvent;
                    for (const combo of combos) {
                        if (matchesCombo(ke, combo)) {
                            if (preventDefault) ke.preventDefault();
                            method.call(el, ke);
                            return;
                        }
                    }
                };

                // Elements need tabindex to receive keyboard events
                if (!global && !el.hasAttribute("tabindex")) {
                    el.setAttribute("tabindex", "0");
                }

                target.addEventListener("keydown", handler);
                return () => target.removeEventListener("keydown", handler);
            });
        });
    };
}
