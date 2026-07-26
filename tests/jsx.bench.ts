/**
 * JSX runtime benchmarks
 *
 * jsx()'s prop loop runs for every prop of every element of every render, so
 * the branch order in that loop is load-bearing. Gates the closure-binding
 * branch: it must peel off inside the existing object/function test rather
 * than adding a new typeof check ahead of the common paths.
 *
 * Inner loops amplify sub-microsecond per-call work so tinybench can sample.
 *
 * Run: npm run bench -- tests/jsx.bench.ts
 */
import { describe, bench } from "vitest";
import { jsx } from "../src/jsx-runtime";
import { Reactive } from "../src/store/reactive";

const LOOP = 500;

describe("jsx() — element creation", () => {
  bench(`bare div (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("div", {});
  });

  bench(`custom element (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("my-widget", {});
  });

  bench(`svg path (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("path", { d: "M0 0" });
  });
});

describe("jsx() — prop application", () => {
  bench(`string attributes x3 (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) {
      jsx("div", { id: "a", title: "t", role: "button" });
    }
  });

  bench(`className string (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("div", { className: "card wide" });
  });

  bench(`boolean attribute (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("div", { hidden: true });
  });

  bench(`enumerated boolean (draggable) (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("div", { draggable: true });
  });

  bench(`event handler (x${LOOP})`, () => {
    const h = () => {};
    for (let i = 0; i < LOOP; i++) jsx("button", { onClick: h });
  });

  bench(`PROP_KEYS value on input (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("input", { value: "hello" });
  });

  bench(`object prop (style) (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("div", { style: { color: "red" } });
  });

  bench(`array JS prop on custom element (x${LOOP})`, () => {
    const items = [1, 2, 3];
    for (let i = 0; i < LOOP; i++) jsx("my-list", { items });
  });

  bench(`mixed realistic props (x${LOOP})`, () => {
    const h = () => {};
    for (let i = 0; i < LOOP; i++) {
      jsx("button", { className: "btn", id: "go", disabled: false, onClick: h, type: "submit" });
    }
  });
});

describe("jsx() — closure bindings", () => {
  const r = new Reactive("live");

  bench(`class closure (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("div", { class: () => r.peek() });
  });

  bench(`attribute closure (title) (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("div", { title: () => r.peek() });
  });

  bench(`traced attribute closure (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("div", { title: () => r.value });
  });

  // Must stay a JS property, not become a binding: arity > 0 marks a template.
  bench(`arity-1 fn prop (template) (x${LOOP})`, () => {
    const fn = (x: unknown) => x;
    for (let i = 0; i < LOOP; i++) jsx("my-list", { renderItem: fn });
  });
});

describe("jsx() — children", () => {
  bench(`text child (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) jsx("span", { children: "hello" });
  });

  bench(`closure text child (x${LOOP})`, () => {
    const r2 = new Reactive(1);
    for (let i = 0; i < LOOP; i++) jsx("span", { children: () => r2.peek() });
  });

  bench(`three element children (x${LOOP})`, () => {
    for (let i = 0; i < LOOP; i++) {
      jsx("div", {
        children: [
          jsx("span", { children: "a" }),
          jsx("span", { children: "b" }),
          jsx("span", { children: "c" }),
        ],
      });
    }
  });
});
