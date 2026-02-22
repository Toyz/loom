/**
 * Tests: @service, @inject, @factory, app.get()
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
  // Reset app providers
  (app as any).providers = new Map();
  (app as any).services = [];
  (app as any).factories = [];
  (app as any).components = [];
  (app as any)._started = false;
});

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

describe("named service resolution", () => {
  it("app.get() resolves a named service by string after start()", async () => {
    const { service } = await import("../src/di/decorators");
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
    const { service, inject } = await import("../src/di/decorators");
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
