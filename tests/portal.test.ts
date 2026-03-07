/**
 * Tests: @portal decorator
 *
 * Covers:
 *  - Portal renders content to a target element
 *  - Portal clears content when method returns null
 *  - Portal container is removed on disconnect
 *  - Portal updates when reactive state changes
 *  - Multiple portals on one component
 *  - Custom className on portal container
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { portal } from "../src/element/portal";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-portal-${++tagCounter}`; }

let portalTarget: HTMLDivElement;

beforeEach(() => {
    portalTarget = document.createElement("div");
    portalTarget.id = "portal-target";
    document.body.appendChild(portalTarget);
});

afterEach(() => {
    cleanup();
    portalTarget.remove();
    // Remove any stray portal containers
    document.querySelectorAll("[data-loom-portal]").forEach(el => el.remove());
});

describe("@portal", () => {
    it("renders content to the target element", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @portal("#portal-target")
            renderPortal() {
                return document.createTextNode("hello from portal");
            }
        }
        customElements.define(tag, El);

        await fixture<El>(tag);
        await new Promise(r => setTimeout(r, 10));

        const container = portalTarget.querySelector("[data-loom-portal]");
        expect(container).toBeDefined();
        expect(container!.textContent).toBe("hello from portal");
    });

    it("clears content when method returns null", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            show = true;

            @portal("#portal-target")
            renderPortal() {
                if (!this.show) return null;
                return document.createTextNode("visible");
            }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        await new Promise(r => setTimeout(r, 10));

        const container = portalTarget.querySelector("[data-loom-portal]");
        expect(container!.textContent).toBe("visible");

        el.show = false;
        el.scheduleUpdate();
        await new Promise(r => setTimeout(r, 10));

        expect(container!.textContent).toBe("");
    });

    it("removes portal container on disconnect", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @portal("#portal-target")
            renderPortal() {
                return document.createTextNode("portal content");
            }
        }
        customElements.define(tag, El);

        await fixture<El>(tag);
        await new Promise(r => setTimeout(r, 10));

        expect(portalTarget.querySelector("[data-loom-portal]")).not.toBeNull();

        cleanup();

        expect(portalTarget.querySelector("[data-loom-portal]")).toBeNull();
    });

    it("applies custom className to portal container", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @portal({ target: "#portal-target", className: "modal-portal" })
            renderPortal() {
                return document.createTextNode("styled");
            }
        }
        customElements.define(tag, El);

        await fixture<El>(tag);
        await new Promise(r => setTimeout(r, 10));

        const container = portalTarget.querySelector("[data-loom-portal]");
        expect(container!.className).toBe("modal-portal");
    });

    it("defaults to document.body when no target specified", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @portal()
            renderPortal() {
                return document.createTextNode("body portal");
            }
        }
        customElements.define(tag, El);

        await fixture<El>(tag);
        await new Promise(r => setTimeout(r, 10));

        const container = document.body.querySelector("[data-loom-portal]");
        expect(container).not.toBeNull();
        expect(container!.textContent).toBe("body portal");
    });

    it("multiple portals on one component", async () => {
        const tag = nextTag();
        const target2 = document.createElement("div");
        target2.id = "portal-target-2";
        document.body.appendChild(target2);

        class El extends LoomElement {
            @portal("#portal-target")
            renderA() { return document.createTextNode("portal A"); }

            @portal("#portal-target-2")
            renderB() { return document.createTextNode("portal B"); }
        }
        customElements.define(tag, El);

        await fixture<El>(tag);
        await new Promise(r => setTimeout(r, 10));

        expect(portalTarget.querySelector("[data-loom-portal]")!.textContent).toBe("portal A");
        expect(target2.querySelector("[data-loom-portal]")!.textContent).toBe("portal B");

        cleanup();
        expect(portalTarget.querySelector("[data-loom-portal]")).toBeNull();
        expect(target2.querySelector("[data-loom-portal]")).toBeNull();
        target2.remove();
    });

    it("false return value clears portal content", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @portal("#portal-target")
            renderPortal() { return false; }
        }
        customElements.define(tag, El);

        await fixture<El>(tag);
        await new Promise(r => setTimeout(r, 10));

        const container = portalTarget.querySelector("[data-loom-portal]");
        expect(container).not.toBeNull();
        expect(container!.textContent).toBe("");
    });

    it("invalid target selector logs warning but doesn't throw", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @portal("#nonexistent-target")
            renderPortal() { return document.createTextNode("orphan"); }
        }
        customElements.define(tag, El);

        // Should not throw
        await fixture<El>(tag);
        await new Promise(r => setTimeout(r, 10));

        // No container created since target doesn't exist
        expect(document.querySelectorAll("[data-loom-portal]").length).toBe(0);
    });

    it("portal re-renders when scheduleUpdate is called", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            label = "initial";

            @portal("#portal-target")
            renderPortal() {
                return document.createTextNode(this.label);
            }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        await new Promise(r => setTimeout(r, 10));

        const container = portalTarget.querySelector("[data-loom-portal]");
        expect(container!.textContent).toBe("initial");

        el.label = "updated";
        el.scheduleUpdate();
        await new Promise(r => setTimeout(r, 10));

        expect(container!.textContent).toBe("updated");
    });

    it("reconnecting element re-creates portal container", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @portal("#portal-target")
            renderPortal() {
                return document.createTextNode("reconnected");
            }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        await new Promise(r => setTimeout(r, 10));

        expect(portalTarget.querySelector("[data-loom-portal]")).not.toBeNull();

        // Disconnect
        el.remove();
        expect(portalTarget.querySelector("[data-loom-portal]")).toBeNull();

        // Reconnect
        document.body.appendChild(el);
        await new Promise(r => setTimeout(r, 10));

        expect(portalTarget.querySelector("[data-loom-portal]")).not.toBeNull();
        expect(portalTarget.querySelector("[data-loom-portal]")!.textContent).toBe("reconnected");
    });
});
