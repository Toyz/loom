/**
 * Tests: @log decorator + LogTransport
 *
 * Covers:
 *  - @log wraps methods and sends LogEntry
 *  - LogEntry has correct component/method/args/duration
 *  - Async methods tracked with full duration
 *  - Errors captured in LogEntry with level:"error"
 *  - No-op when no LogTransport registered
 *  - Custom transport receives entries
 *  - Level override: @log("warn")
 *  - Options object: @log({ level, label })
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { LoomElement } from "../src/element";
import { log, LogTransport, ConsoleTransport, resetLogTransport } from "../src/element/log";
import type { LogEntry } from "../src/element/log";
import { app } from "../src/app";
import { fixture, cleanup } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-log-${++tagCounter}`; }

/** Spy transport that collects entries */
class SpyTransport extends LogTransport {
    entries: LogEntry[] = [];
    send(entry: LogEntry) { this.entries.push(entry); }
}

let spy: SpyTransport;

beforeEach(() => {
    spy = new SpyTransport();
    app.use(LogTransport, spy);
    resetLogTransport();
});

afterEach(() => {
    cleanup();
    resetLogTransport();
});

describe("@log", () => {
    it("logs sync method calls with correct fields", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log
            greet(name: string) { return `hello ${name}`; }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        const result = el.greet("world");

        expect(result).toBe("hello world");
        expect(spy.entries).toHaveLength(1);

        const entry = spy.entries[0];
        expect(entry.level).toBe("info");
        expect(entry.component).toBe(tag);
        expect(entry.method).toBe("greet");
        expect(entry.args).toEqual(["world"]);
        expect(entry.result).toBe("hello world");
        expect(entry.error).toBeUndefined();
        expect(entry.duration).toBeGreaterThanOrEqual(0);
        expect(entry.timestamp).toBeGreaterThan(0);
    });

    it("logs async methods after resolution", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log
            async fetchData(id: number) {
                await new Promise(r => setTimeout(r, 10));
                return { id, name: "test" };
            }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        const result = await el.fetchData(42);

        expect(result).toEqual({ id: 42, name: "test" });
        expect(spy.entries).toHaveLength(1);

        const entry = spy.entries[0];
        expect(entry.method).toBe("fetchData");
        expect(entry.args).toEqual([42]);
        expect(entry.result).toEqual({ id: 42, name: "test" });
        expect(entry.duration).toBeGreaterThanOrEqual(5); // at least some time for async
    });

    it("captures errors with level:error", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log
            explode() { throw new Error("boom"); }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        expect(() => el.explode()).toThrow("boom");

        expect(spy.entries).toHaveLength(1);
        const entry = spy.entries[0];
        expect(entry.level).toBe("error");
        expect(entry.error).toBeInstanceOf(Error);
        expect(entry.error!.message).toBe("boom");
        expect(entry.result).toBeUndefined();
    });

    it("captures async rejections with level:error", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log
            async fail() { throw new Error("async boom"); }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        await expect(el.fail()).rejects.toThrow("async boom");

        expect(spy.entries).toHaveLength(1);
        expect(spy.entries[0].level).toBe("error");
        expect(spy.entries[0].error!.message).toBe("async boom");
    });

    it("supports @log('warn') level shorthand", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log("warn")
            risky() { return true; }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.risky();

        expect(spy.entries).toHaveLength(1);
        expect(spy.entries[0].level).toBe("warn");
    });

    it("supports @log({ level, label }) options", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log({ level: "debug", label: "Search" })
            filter(q: string) { return q.length; }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.filter("hello");

        expect(spy.entries).toHaveLength(1);
        const entry = spy.entries[0];
        expect(entry.level).toBe("debug");
        expect(entry.label).toBe("Search");
    });

    it("is a no-op when no transport registered", async () => {
        // Clear the transport
        resetLogTransport();
        // Re-create app without LogTransport
        (app as any).providers.delete(LogTransport);
        resetLogTransport();

        const tag = nextTag();

        class El extends LoomElement {
            @log
            noop() { return 42; }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        const result = el.noop();

        expect(result).toBe(42);
        expect(spy.entries).toHaveLength(0); // spy not used
    });

    it("ConsoleTransport sends to console", async () => {
        // Replace with console transport
        const transport = new ConsoleTransport();
        app.use(LogTransport, transport);
        resetLogTransport();

        const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => { });
        const tag = nextTag();

        class El extends LoomElement {
            @log
            hello() { return "hi"; }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.hello();

        expect(consoleSpy).toHaveBeenCalledOnce();
        const args = consoleSpy.mock.calls[0];
        expect(args[0]).toContain("hello()");
        consoleSpy.mockRestore();
    });

    it("logs multiple calls independently", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log
            add(a: number, b: number) { return a + b; }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.add(1, 2);
        el.add(3, 4);

        expect(spy.entries).toHaveLength(2);
        expect(spy.entries[0].args).toEqual([1, 2]);
        expect(spy.entries[0].result).toBe(3);
        expect(spy.entries[1].args).toEqual([3, 4]);
        expect(spy.entries[1].result).toBe(7);
    });

    it("includeArgs: false omits all args", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log({ includeArgs: false })
            login(user: string, pass: string) { return true; }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.login("admin", "secret123");

        expect(spy.entries).toHaveLength(1);
        expect(spy.entries[0].args).toEqual([]);
        expect(spy.entries[0].result).toBe(true);
    });

    it("skipArgs array fully redacts specific indices", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log({ skipArgs: [1] })
            login(user: string, pass: string) { return true; }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.login("admin", "secret123");

        expect(spy.entries[0].args).toEqual(["admin", "[redacted]"]);
    });

    it("skipArgs record with true fully redacts that index", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log({ skipArgs: { 0: true, 2: true } })
            multi(a: string, b: string, c: string) { return "ok"; }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.multi("secret", "visible", "hidden");

        expect(spy.entries[0].args).toEqual(["[redacted]", "visible", "[redacted]"]);
    });

    it("skipArgs record with string[] redacts nested object keys", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log({ skipArgs: { 0: ["password", "token"] } })
            submit(data: Record<string, unknown>) { return true; }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.submit({ username: "admin", password: "secret", token: "abc123", role: "user" });

        const logged = spy.entries[0].args[0] as Record<string, unknown>;
        expect(logged.username).toBe("admin");
        expect(logged.password).toBe("[redacted]");
        expect(logged.token).toBe("[redacted]");
        expect(logged.role).toBe("user");
    });

    it("skipArgs supports dot-path for deeply nested keys", async () => {
        const tag = nextTag();

        class El extends LoomElement {
            @log({ skipArgs: { 0: ["user.email", "user.ssn"] } })
            process(data: any) { return true; }
        }
        customElements.define(tag, El);

        const el = await fixture<El>(tag);
        el.process({ user: { name: "Alice", email: "a@b.com", ssn: "123-45-6789" }, id: 1 });

        const logged = spy.entries[0].args[0] as any;
        expect(logged.user.name).toBe("Alice");
        expect(logged.user.email).toBe("[redacted]");
        expect(logged.user.ssn).toBe("[redacted]");
        expect(logged.id).toBe(1);
    });
});
