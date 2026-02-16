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
  it("returns undefined for missing provider", () => {
    expect(app.maybe(Logger)).toBeUndefined();
  });

  it("returns provider when registered", () => {
    const logger = new Logger();
    app.use(logger);
    expect(app.maybe(Logger)).toBe(logger);
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
