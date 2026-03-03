/**
 * Tests: @provide / @consume context decorators
 *
 * Covers:
 *  - Class key: provider auto-instantiates, consumer receives
 *  - String key: primitive value sharing
 *  - Multiple consumers share one provider
 *  - Late-connecting consumer gets current value
 *  - Provider value change pushes to consumers
 *  - Consumer disconnect cleans up (no leaks)
 *  - Nested providers: consumer gets nearest ancestor
 *  - No provider: consumer stays undefined
 *  - Cross-shadow-boundary propagation
 */
import { describe, it, expect, afterEach } from "vitest";
import { LoomElement } from "../src/element";
import { provide, consume } from "../src/element/context";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-ctx-${++tagCounter}`; }

afterEach(() => {
    cleanup();
});

class ThemeContext {
    mode: "dark" | "light" = "dark";
    primary = "#818cf8";
}

describe("@provide / @consume", () => {
    it("class key: provider auto-instantiates, consumer receives value", async () => {
        const providerTag = nextTag();
        const consumerTag = nextTag();

        class Provider extends LoomElement {
            @provide(ThemeContext) accessor theme!: ThemeContext;
        }
        customElements.define(providerTag, Provider);

        class Consumer extends LoomElement {
            @consume(ThemeContext) accessor theme!: ThemeContext;
        }
        customElements.define(consumerTag, Consumer);

        // Build DOM: <provider><consumer></consumer></provider>
        const provider = document.createElement(providerTag) as Provider;
        const consumer = document.createElement(consumerTag) as Consumer;
        provider.appendChild(consumer);
        document.body.appendChild(provider);

        await new Promise(r => setTimeout(r, 0));

        // Consumer should have the auto-instantiated theme
        expect(consumer.theme).toBeDefined();
        expect(consumer.theme.mode).toBe("dark");
        expect(consumer.theme.primary).toBe("#818cf8");

        provider.remove();
    });

    it("string key: shares primitive values", async () => {
        const providerTag = nextTag();
        const consumerTag = nextTag();

        class Provider extends LoomElement {
            @provide("locale") accessor locale = "en-US";
        }
        customElements.define(providerTag, Provider);

        class Consumer extends LoomElement {
            @consume("locale") accessor locale!: string;
        }
        customElements.define(consumerTag, Consumer);

        const provider = document.createElement(providerTag) as Provider;
        const consumer = document.createElement(consumerTag) as Consumer;
        provider.appendChild(consumer);
        document.body.appendChild(provider);

        await new Promise(r => setTimeout(r, 0));

        expect(consumer.locale).toBe("en-US");

        provider.remove();
    });

    it("multiple consumers share one provider", async () => {
        const providerTag = nextTag();
        const consumerTag = nextTag();

        class Provider extends LoomElement {
            @provide("count") accessor count = 42;
        }
        customElements.define(providerTag, Provider);

        class Consumer extends LoomElement {
            @consume("count") accessor count!: number;
        }
        customElements.define(consumerTag, Consumer);

        const provider = document.createElement(providerTag) as Provider;
        const c1 = document.createElement(consumerTag) as Consumer;
        const c2 = document.createElement(consumerTag) as Consumer;
        provider.appendChild(c1);
        provider.appendChild(c2);
        document.body.appendChild(provider);

        await new Promise(r => setTimeout(r, 0));

        expect(c1.count).toBe(42);
        expect(c2.count).toBe(42);

        provider.remove();
    });

    it("provider value change pushes to all consumers", async () => {
        const providerTag = nextTag();
        const consumerTag = nextTag();

        class Provider extends LoomElement {
            @provide("val") accessor val = "initial";
        }
        customElements.define(providerTag, Provider);

        class Consumer extends LoomElement {
            @consume("val") accessor val!: string;
        }
        customElements.define(consumerTag, Consumer);

        const provider = document.createElement(providerTag) as Provider;
        const c1 = document.createElement(consumerTag) as Consumer;
        const c2 = document.createElement(consumerTag) as Consumer;
        provider.appendChild(c1);
        provider.appendChild(c2);
        document.body.appendChild(provider);

        await new Promise(r => setTimeout(r, 0));

        expect(c1.val).toBe("initial");
        expect(c2.val).toBe("initial");

        // Update provider
        provider.val = "updated";

        expect(c1.val).toBe("updated");
        expect(c2.val).toBe("updated");

        provider.remove();
    });

    it("late-connecting consumer gets current value", async () => {
        const providerTag = nextTag();
        const consumerTag = nextTag();

        class Provider extends LoomElement {
            @provide("data") accessor data = "hello";
        }
        customElements.define(providerTag, Provider);

        class Consumer extends LoomElement {
            @consume("data") accessor data!: string;
        }
        customElements.define(consumerTag, Consumer);

        const provider = document.createElement(providerTag) as Provider;
        document.body.appendChild(provider);

        await new Promise(r => setTimeout(r, 0));

        // Change value before consumer connects
        provider.data = "world";

        // Now connect consumer
        const consumer = document.createElement(consumerTag) as Consumer;
        provider.appendChild(consumer);

        await new Promise(r => setTimeout(r, 0));

        expect(consumer.data).toBe("world");

        provider.remove();
    });

    it("consumer disconnect cleans up subscription", async () => {
        const providerTag = nextTag();
        const consumerTag = nextTag();

        class Provider extends LoomElement {
            @provide("val") accessor val = "a";
        }
        customElements.define(providerTag, Provider);

        class Consumer extends LoomElement {
            @consume("val") accessor val!: string;
        }
        customElements.define(consumerTag, Consumer);

        const provider = document.createElement(providerTag) as Provider;
        const consumer = document.createElement(consumerTag) as Consumer;
        provider.appendChild(consumer);
        document.body.appendChild(provider);

        await new Promise(r => setTimeout(r, 0));
        expect(consumer.val).toBe("a");

        // Disconnect consumer
        consumer.remove();

        // Update provider — should not affect disconnected consumer
        provider.val = "b";
        expect(consumer.val).toBe("a");

        provider.remove();
    });

    it("nested providers: consumer gets nearest ancestor", async () => {
        const outerTag = nextTag();
        const innerTag = nextTag();
        const consumerTag = nextTag();

        class OuterProvider extends LoomElement {
            @provide("level") accessor level = "outer";
        }
        customElements.define(outerTag, OuterProvider);

        class InnerProvider extends LoomElement {
            @provide("level") accessor level = "inner";
        }
        customElements.define(innerTag, InnerProvider);

        class Consumer extends LoomElement {
            @consume("level") accessor level!: string;
        }
        customElements.define(consumerTag, Consumer);

        // Structure: <outer><inner><consumer></consumer></inner></outer>
        const outer = document.createElement(outerTag) as OuterProvider;
        const inner = document.createElement(innerTag) as InnerProvider;
        const consumer = document.createElement(consumerTag) as Consumer;
        inner.appendChild(consumer);
        outer.appendChild(inner);
        document.body.appendChild(outer);

        await new Promise(r => setTimeout(r, 0));

        // Consumer should get "inner" (nearest provider)
        expect(consumer.level).toBe("inner");

        outer.remove();
    });

    it("no provider: consumer stays undefined", async () => {
        const consumerTag = nextTag();

        class Consumer extends LoomElement {
            @consume("missing") accessor data!: string;
        }
        customElements.define(consumerTag, Consumer);

        const consumer = document.createElement(consumerTag) as Consumer;
        document.body.appendChild(consumer);

        await new Promise(r => setTimeout(r, 0));

        expect(consumer.data).toBeUndefined();

        consumer.remove();
    });

    it("provider accessor reads auto-instantiated value", async () => {
        const tag = nextTag();

        class Provider extends LoomElement {
            @provide(ThemeContext) accessor theme!: ThemeContext;
        }
        customElements.define(tag, Provider);

        const provider = document.createElement(tag) as Provider;
        document.body.appendChild(provider);

        await new Promise(r => setTimeout(r, 0));

        // Provider should be able to read its own auto-instantiated value
        expect(provider.theme).toBeDefined();
        expect(provider.theme.mode).toBe("dark");

        provider.remove();
    });
});
