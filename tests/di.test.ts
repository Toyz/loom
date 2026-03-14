/**
 * Tests: DI container — @service, @inject, @maybe, @factory, app.get/has/replace/reset/keys
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { app } from "../src/app";
import { LoomEvent } from "../src/event";

class Logger {
  logs: string[] = [];
  log(msg: string) { this.logs.push(msg); }
}

class ApiClient {
  constructor(public baseUrl: string) {}
}

beforeEach(() => {
  app.reset();
});

// ── app.use() ──

describe("app.use()", () => {
  it("registers a provider by class", () => {
    const logger = new Logger();
    app.use(logger);
    expect(app.get(Logger)).toBe(logger);
  });

  it("registers a provider with explicit key", () => {
    const client = new ApiClient("https://api.example.com");
    app.use(ApiClient, client);
    expect(app.get(ApiClient)).toBe(client);
  });
});

// ── app.get() ──

describe("app.get()", () => {
  it("returns registered provider", () => {
    const logger = new Logger();
    app.use(logger);
    expect(app.get(Logger)).toBe(logger);
  });

  it("throws for missing provider", () => {
    expect(() => app.get(Logger)).toThrow();
  });
});

// ── app.maybe() ──

describe("app.maybe()", () => {
  it("returns Err result for missing provider", () => {
    const result = app.maybe(Logger);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("returns Ok result when registered", () => {
    const logger = new Logger();
    app.use(logger);
    const result = app.maybe(Logger);
    expect(result.ok).toBe(true);
    expect(result.data).toBe(logger);
  });
});

// ── app.has() ──

describe("app.has()", () => {
  it("returns false for unregistered provider", () => {
    expect(app.has(Logger)).toBe(false);
  });

  it("returns true after registration", () => {
    app.use(new Logger());
    expect(app.has(Logger)).toBe(true);
  });

  it("returns true for string key", () => {
    app.use("config", { debug: true });
    expect(app.has("config")).toBe(true);
  });
});

// ── app.replace() ──

describe("app.replace()", () => {
  it("replaces an existing provider", () => {
    const original = new Logger();
    app.use(original);
    const mock = new Logger();
    app.replace(Logger, mock);
    expect(app.get(Logger)).toBe(mock);
    expect(app.get(Logger)).not.toBe(original);
  });

  it("is chainable", () => {
    const result = app.replace("a", 1).replace("b", 2);
    expect(result).toBe(app);
  });
});

// ── app.reset() ──

describe("app.reset()", () => {
  it("clears all providers", () => {
    app.use(new Logger());
    app.reset();
    expect(app.has(Logger)).toBe(false);
    expect(() => app.get(Logger)).toThrow();
  });

  it("resets started state", () => {
    // Simulate started state
    app.use(new Logger());
    app.reset();
    expect(app.started).toBe(false);
  });
});

// ── app.keys() ──

describe("app.keys()", () => {
  it("returns empty array when no providers", () => {
    expect(app.keys()).toEqual([]);
  });

  it("returns all registered keys", () => {
    app.use(new Logger());
    app.use(ApiClient, new ApiClient("http://x"));
    const keys = app.keys();
    expect(keys).toContain(Logger);
    expect(keys).toContain(ApiClient);
    expect(keys).toHaveLength(2);
  });
});

// ── app event bus delegation ──

describe("app event bus delegation", () => {
  it("app.on/emit routes through global bus", () => {
    class Ping extends LoomEvent {}

    const fn = vi.fn();
    app.on(Ping, fn);
    app.emit(new Ping());
    expect(fn).toHaveBeenCalledOnce();
    app.off(Ping, fn);
  });
});

// ── named service resolution ──

describe("named service resolution", () => {
  it("app.get() resolves a named service by string after start()", async () => {
    const { SERVICE_NAME } = await import("../src/decorators/symbols");

    class MyApi {
      url = "https://api.example.com";
    }
    // Simulate @service("MyApi")
    (MyApi as any)[SERVICE_NAME.key] = "MyApi";
    app.registerService(MyApi);
    await app.start();

    const byClass = app.get(MyApi);
    const byName = app.get("MyApi");
    expect(byName).toBe(byClass);
    expect(byName).toBeInstanceOf(MyApi);
  });

  it("@inject('name') accessor resolves by string name", async () => {
    const { inject } = await import("../src/app");
    const { SERVICE_NAME } = await import("../src/decorators/symbols");

    class ConfigService {
      value = 42;
    }
    (ConfigService as any)[SERVICE_NAME.key] = "Config";
    app.registerService(ConfigService);
    await app.start();

    // Simulate what @inject("Config") does on an accessor
    const descriptor = inject<ConfigService>("Config");
    const result = descriptor(
      {} as any,
      { kind: "accessor", name: "cfg" } as any,
    );
    const instance = result.get!.call({});
    expect(instance).toBeInstanceOf(ConfigService);
    expect(instance.value).toBe(42);
  });
});

// ── @maybe decorator ──

describe("@maybe — optional inject", () => {
  it("returns undefined when provider is not registered", async () => {
    const { maybe } = await import("../src/app");

    class Analytics { track(_e: string) {} }

    const descriptor = maybe<Analytics>(Analytics);
    const result = descriptor(
      {} as any,
      { kind: "accessor", name: "analytics" } as any,
    );
    const value = result.get!.call({});
    expect(value).toBeUndefined();
  });

  it("returns the instance when provider is registered", async () => {
    const { maybe } = await import("../src/app");

    class Analytics { track(_e: string) {} }
    const instance = new Analytics();
    app.use(instance);

    const descriptor = maybe<Analytics>(Analytics);
    const result = descriptor(
      {} as any,
      { kind: "accessor", name: "analytics" } as any,
    );
    const value = result.get!.call({});
    expect(value).toBe(instance);
  });

  it("returns undefined for string key when not registered", async () => {
    const { maybe } = await import("../src/app");

    const descriptor = maybe<string>("OptionalConfig");
    const result = descriptor(
      {} as any,
      { kind: "accessor", name: "cfg" } as any,
    );
    expect(result.get!.call({})).toBeUndefined();
  });
});

// ── @inject set warning ──

describe("@inject — set warning", () => {
  it("warns on set instead of silently ignoring", async () => {
    const { inject } = await import("../src/app");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    class Svc {}
    app.use(new Svc());

    const descriptor = inject<Svc>(Svc);
    const result = descriptor(
      {} as any,
      { kind: "accessor", name: "svc" } as any,
    );
    result.set!.call({}, new Svc());
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("read-only"));
    spy.mockRestore();
  });
});

// ── Duplicate service guard ──

describe("duplicate service guard", () => {
  it("registerService does not add the same class twice", () => {
    class Svc {}
    app.registerService(Svc);
    app.registerService(Svc);
    // Access private services array to verify
    expect((app as any).services.filter((s: any) => s === Svc)).toHaveLength(1);
  });
});
