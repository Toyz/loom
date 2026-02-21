/**
 * Morph Engine Benchmarks
 *
 * Measures ops/sec for every hot path in morph():
 *   text updates, attribute diffing, keyed reconciliation,
 *   wide/deep trees, event/property patching, no-ops, tag mismatches.
 *
 * Run:  npm run bench
 */
import { describe, bench } from "vitest";
import { morph, LOOM_EVENTS, LOOM_PROPS } from "../src/morph";

// ── Helpers ──

/** Detached shadow root — never appended to document.body to avoid OOM */
function freshShadow(): ShadowRoot {
    return document.createElement("div").attachShadow({ mode: "open" });
}

function el(tag: string, attrs?: Record<string, string>, text?: string): Element {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text) e.textContent = text;
    return e;
}

function keyedItem(key: string, text: string): Element {
    return el("div", { "loom-key": key }, text);
}

function buildDeep(depth: number, branch: number): Element {
    const root = el("div", { class: `d${depth}` });
    if (depth <= 0) {
        root.textContent = `leaf-${branch}`;
        return root;
    }
    for (let i = 0; i < 3; i++) {
        root.appendChild(buildDeep(depth - 1, i));
    }
    return root;
}

// ── Benchmarks ──

describe("morph engine", () => {
    bench("text update", () => {
        const shadow = freshShadow();
        shadow.appendChild(el("div", undefined, "old text"));
        morph(shadow, el("div", undefined, "new text"));
    });

    bench("attribute patch (add/update/remove)", () => {
        const shadow = freshShadow();
        shadow.appendChild(el("div", { class: "a", id: "x", "data-v": "1" }));
        morph(shadow, el("div", { class: "b", "data-v": "2", "aria-label": "hi" }));
    });

    bench("reorder 100 keyed children (reverse)", () => {
        const N = 100;
        const shadow = freshShadow();
        for (let i = 0; i < N; i++) shadow.appendChild(keyedItem(`k${i}`, `item-${i}`));
        const children: Node[] = [];
        for (let i = N - 1; i >= 0; i--) children.push(keyedItem(`k${i}`, `item-${i}-rev`));
        morph(shadow, children);
    });

    bench("replace 50 keyed children (new keys)", () => {
        const N = 50;
        const shadow = freshShadow();
        for (let i = 0; i < N; i++) shadow.appendChild(keyedItem(`old-${i}`, `old-${i}`));
        const children: Node[] = [];
        for (let i = 0; i < N; i++) children.push(keyedItem(`new-${i}`, `new-${i}`));
        morph(shadow, children);
    });

    bench("append 50 to 50 unkeyed", () => {
        const shadow = freshShadow();
        for (let i = 0; i < 50; i++) shadow.appendChild(el("li", undefined, `existing-${i}`));
        const children: Node[] = [];
        for (let i = 0; i < 100; i++) children.push(el("li", undefined, `item-${i}`));
        morph(shadow, children);
    });

    bench("remove 90 of 100 unkeyed", () => {
        const shadow = freshShadow();
        for (let i = 0; i < 100; i++) shadow.appendChild(el("li", undefined, `item-${i}`));
        const children: Node[] = [];
        for (let i = 0; i < 10; i++) children.push(el("li", undefined, `item-${i}`));
        morph(shadow, children);
    });

    bench("deep tree (depth=4, branching=3 → 121 nodes)", () => {
        const shadow = freshShadow();
        shadow.appendChild(buildDeep(4, 0));
        morph(shadow, buildDeep(4, 0));
    });

    bench("wide flat list (200 keyed <li>)", () => {
        const N = 200;
        const shadow = freshShadow();
        const ul = document.createElement("ul");
        for (let i = 0; i < N; i++) ul.appendChild(el("li", { "loom-key": `w${i}` }, `item-${i}`));
        shadow.appendChild(ul);
        // Rotate by 1
        const ul2 = document.createElement("ul");
        for (let i = 1; i < N; i++) ul2.appendChild(el("li", { "loom-key": `w${i}` }, `item-${i}`));
        ul2.appendChild(el("li", { "loom-key": "w0" }, "item-0"));
        morph(shadow, ul2);
    });

    bench("swap click handler", () => {
        const shadow = freshShadow();
        const d = document.createElement("div");
        const h1 = () => { };
        d.addEventListener("click", h1);
        (d as any)[LOOM_EVENTS] = new Map([["click", h1]]);
        shadow.appendChild(d);
        const d2 = document.createElement("div");
        const h2 = () => { };
        d2.addEventListener("click", h2);
        (d2 as any)[LOOM_EVENTS] = new Map([["click", h2]]);
        morph(shadow, d2);
    });

    bench("patch value + JS props", () => {
        const shadow = freshShadow();
        const input = document.createElement("input");
        (input as HTMLInputElement).value = "old";
        const d = document.createElement("div");
        (d as any).items = [1, 2, 3];
        (d as any)[LOOM_PROPS] = new Map([["items", [1, 2, 3]]]);
        shadow.appendChild(input);
        shadow.appendChild(d);
        const input2 = document.createElement("input");
        (input2 as HTMLInputElement).value = "new";
        const d2 = document.createElement("div");
        (d2 as any).items = [4, 5, 6];
        (d2 as any)[LOOM_PROPS] = new Map([["items", [4, 5, 6]]]);
        morph(shadow, [input2, d2]);
    });

    bench("no-op (identical tree)", () => {
        const shadow = freshShadow();
        shadow.appendChild(el("div", { class: "same", id: "same" }, "same text"));
        morph(shadow, el("div", { class: "same", id: "same" }, "same text"));
    });

    bench("tag mismatch (div → span)", () => {
        const shadow = freshShadow();
        shadow.appendChild(el("div", undefined, "I am a div"));
        morph(shadow, el("span", undefined, "I am a span"));
    });
});
