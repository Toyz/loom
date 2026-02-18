import { describe, it, expect, beforeEach } from "vitest";
import {
    startTrace,
    endTrace,
    recordRead,
    startSubTrace,
    endSubTrace,
    addBinding,
    isTracing,
    type Binding
} from "../src/trace";
import { Reactive } from "../src/store/reactive";

describe("Trace with Nested Sub-traces", () => {
    let r1: Reactive<number>;
    let r2: Reactive<number>;
    let r3: Reactive<number>;

    beforeEach(() => {
        r1 = new Reactive(1);
        r2 = new Reactive(2);
        r3 = new Reactive(3);
    });

    it("should isolate dependencies in a sub-trace", () => {
        startTrace();

        // Parent trace reads r1
        r1.value;

        // Sub-trace reads r2
        startSubTrace();
        r2.value;
        const subDeps = endSubTrace();

        const trace = endTrace();

        // Verify sub-trace captured r2
        expect(subDeps.has(r2)).toBe(true);
        expect(subDeps.has(r1)).toBe(false);

        // Verify parent trace has both (because endSubTrace merges back)
        expect(trace.deps.has(r1)).toBe(true);
        expect(trace.deps.has(r2)).toBe(true);
    });

    it("should handle multiple nested sub-traces", () => {
        startTrace();
        r1.value;

        startSubTrace();
        r2.value;

        startSubTrace();
        r3.value;
        const innerDeps = endSubTrace();
        expect(innerDeps.has(r3)).toBe(true);
        expect(innerDeps.has(r2)).toBe(false);

        const outerDeps = endSubTrace();
        expect(outerDeps.has(r2)).toBe(true);
        expect(outerDeps.has(r3)).toBe(true); // Merged from inner

        const trace = endTrace();
        expect(trace.deps.has(r1)).toBe(true);
        expect(trace.deps.has(r2)).toBe(true);
        expect(trace.deps.has(r3)).toBe(true);
    });

    it("should create bindings with multiple dependencies", () => {
        const el = document.createElement("div");
        const patcher = () => { };

        startTrace();
        startSubTrace();
        r1.value;
        r2.value;
        const deps = endSubTrace();

        addBinding(deps, el, patcher);

        const trace = endTrace();

        // r1 and r2 should both point to the same binding
        const b1 = trace.bindings.get(r1);
        const b2 = trace.bindings.get(r2);

        expect(b1).toBeDefined();
        expect(b2).toBeDefined();
        expect(b1![0]).toBe(b2![0]); // Same binding instance
        expect(b1![0].reactives.has(r1)).toBe(true);
        expect(b1![0].reactives.has(r2)).toBe(true);
    });

    it("should return empty deps for empty sub-trace", () => {
        startTrace();
        startSubTrace();
        const deps = endSubTrace();
        expect(deps.size).toBe(0);
        endTrace();
    });
});
