import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LoomElement } from "../src/element";
import { Reactive } from "../src/store/reactive";
import { reactive } from "../src/store";
import { jsx } from "../src/jsx-runtime";
import { startTrace, endTrace, hasDirtyDeps, canFastPatch, applyBindings } from "../src/trace";

// Mock implementation of a component for testing without browser registration overhead
class TestComponent extends LoomElement {
    @reactive accessor count = 1;
    @reactive accessor theme = "light";

    update() {
        return jsx("div", {
            className: () => this.theme,
            children: [
                "Count: ",
                () => this.count
            ]
        });
    }
}
customElements.define("test-closure-binding", TestComponent);

describe("Phase 2: Closure Bindings Integration", () => {
    let el: TestComponent;

    beforeEach(() => {
        el = new TestComponent();
        document.body.appendChild(el);
    });

    afterEach(() => {
        document.body.removeChild(el);
    });

    it("should fast-patch text node with closure binding", async () => {
        // Initial render
        el.scheduleUpdate();
        await new Promise(resolve => requestAnimationFrame(resolve));

        const div = el.shadowRoot!.firstElementChild!;
        expect(div.textContent).toBe("Count: 1");

        // Capture trace deps manually to verify binding creation
        startTrace();
        el.update();
        const trace = endTrace();

        // Should have 2 bindings: class and text
        expect(trace.bindings.size).toBe(2);

        // Update reactive
        el.count = 2;

        // Verify fast-patch capability
        expect(el.__traceDeps).toBeDefined();
        // Simulate scheduleUpdate logic manually to check flag
        expect(canFastPatch(el.__traceDeps)).toBe(true);

        // Let the framework update
        el.scheduleUpdate();
        await new Promise(resolve => requestAnimationFrame(resolve));

        expect(div.textContent).toBe("Count: 2");
    });

    it("should fast-patch attribute with closure binding", async () => {
        el.scheduleUpdate();
        await new Promise(resolve => requestAnimationFrame(resolve));

        const div = el.shadowRoot!.firstElementChild!;
        expect(div.className).toBe("light");

        el.theme = "dark";
        expect(canFastPatch(el.__traceDeps)).toBe(true);

        el.scheduleUpdate();
        await new Promise(resolve => requestAnimationFrame(resolve));

        expect(div.className).toBe("dark");
    });

    it("should not fast-patch if dependency is not bound", async () => {
        // Create a component with mixed content
        class MixedComponent extends LoomElement {
            @reactive accessor count = 1;
            @reactive accessor unbound = "static";

            update() {
                return jsx("div", {
                    children: [
                        () => this.count, // Bound
                        this.unbound      // Not bound (static value at render)
                    ]
                });
            }
        }
        customElements.define("test-mixed-binding", MixedComponent);
        const mixed = new MixedComponent();
        document.body.appendChild(mixed);

        mixed.scheduleUpdate();
        await new Promise(resolve => requestAnimationFrame(resolve));

        // Update bound prop -> fast-patch
        mixed.count = 2;
        expect(canFastPatch(mixed.__traceDeps)).toBe(true);

        // Update unbound prop -> full morph
        mixed.unbound = "changed";

        // This part is tricky to test since the new trace deps haven't been captured yet
        // for the 'unbound' read because it wasn't a binding.
        // In Phase 1, 'unbound' was read during update(), so trace.deps has it.
        // But trace.bindings does NOT have it.
        // So canFastPatch should return false.

        // Check trace from Render 1 (before update cycle runs)
        expect(canFastPatch(mixed.__traceDeps)).toBe(false);

        // Wait for update cycle to refresh trace deps
        mixed.scheduleUpdate();
        await new Promise(resolve => requestAnimationFrame(resolve));

        document.body.removeChild(mixed);
    });
});
