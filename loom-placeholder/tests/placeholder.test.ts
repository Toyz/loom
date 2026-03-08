/**
 * @toyz/loom-placeholder — Test Suite
 */
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "@toyz/loom";
import {
  PlaceholderProvider,
  RgbaPlaceholder,
} from "@toyz/loom-placeholder";
import { MockPlaceholder } from "@toyz/loom-placeholder/testing";

// ── RgbaPlaceholder URL generation ──

describe("RgbaPlaceholder", () => {
  const provider = new RgbaPlaceholder();

  it("generates RGB URL", () => {
    const url = provider.rgba({
      r: 255,
      g: 0,
      b: 170,
      width: 300,
      height: 200,
    });
    expect(url).toBe("https://rgba.lol/ff/00/aa/300x200.png");
  });

  it("generates RGBA URL with alpha", () => {
    const url = provider.rgba({
      r: 255,
      g: 0,
      b: 170,
      a: 128,
      width: 64,
      height: 64,
    });
    expect(url).toBe("https://rgba.lol/ff/00/aa/80/64x64.png");
  });

  it("generates SVG format", () => {
    const url = provider.rgba({
      r: 0,
      g: 255,
      b: 0,
      width: 100,
      height: 100,
      format: "svg",
    });
    expect(url).toBe("https://rgba.lol/00/ff/00/100x100.svg");
  });

  it("zero-pads single digit hex values", () => {
    const url = provider.rgba({
      r: 5,
      g: 0,
      b: 15,
      width: 50,
      height: 50,
    });
    expect(url).toBe("https://rgba.lol/05/00/0f/50x50.png");
  });

  it("clamps values to 0-255 range", () => {
    const url = provider.rgba({
      r: 300,
      g: -10,
      b: 128,
      width: 10,
      height: 10,
    });
    expect(url).toBe("https://rgba.lol/ff/00/80/10x10.png");
  });

  it("supports custom base URL", () => {
    const custom = new RgbaPlaceholder("https://my-proxy.example.com");
    const url = custom.rgba({
      r: 255,
      g: 255,
      b: 255,
      width: 1,
      height: 1,
    });
    expect(url).toBe("https://my-proxy.example.com/ff/ff/ff/1x1.png");
  });

  it("strips trailing slash from base URL", () => {
    const custom = new RgbaPlaceholder("https://rgba.lol/");
    const url = custom.rgba({ r: 0, g: 0, b: 0, width: 10, height: 10 });
    expect(url).toBe("https://rgba.lol/00/00/00/10x10.png");
  });

  it("url() falls back to gray when no color channels", () => {
    const url = provider.url({ width: 200, height: 100 });
    expect(url).toBe("https://rgba.lol/cc/cc/cc/200x100.png");
  });

  it("url() passes through RGBA options", () => {
    const url = provider.url({
      r: 255,
      g: 0,
      b: 0,
      width: 50,
      height: 50,
    } as any);
    expect(url).toBe("https://rgba.lol/ff/00/00/50x50.png");
  });

  it("url() generates full RGBA with alpha", () => {
    const url = provider.url({
      r: 0,
      g: 0,
      b: 0,
      a: 0,
      width: 1,
      height: 1,
    } as any);
    expect(url).toBe("https://rgba.lol/00/00/00/00/1x1.png");
  });
});

// ── MockPlaceholder ──

describe("MockPlaceholder", () => {
  let mock: MockPlaceholder;

  beforeEach(() => {
    mock = new MockPlaceholder();
  });

  it("returns predictable URL", () => {
    const url = mock.url({ width: 300, height: 200 });
    expect(url).toBe("mock://300x200");
  });

  it("records calls", () => {
    mock.url({ width: 100, height: 50 });
    mock.url({ width: 200, height: 100, format: "svg" });
    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[0]).toEqual({ width: 100, height: 50 });
    expect(mock.calls[1]).toEqual({ width: 200, height: 100, format: "svg" });
  });

  it("assertCalled succeeds with correct count", () => {
    mock.url({ width: 10, height: 10 });
    mock.url({ width: 20, height: 20 });
    mock.assertCalled(2);
  });

  it("assertCalled throws with wrong count", () => {
    mock.url({ width: 10, height: 10 });
    expect(() => mock.assertCalled(2)).toThrow(
      "Expected 2 placeholder calls, got 1",
    );
  });

  it("assertCalledWith matches partial options", () => {
    mock.url({ width: 300, height: 200, format: "png" });
    mock.assertCalledWith({ width: 300 });
    mock.assertCalledWith({ height: 200 });
    mock.assertCalledWith({ format: "png" });
  });

  it("assertCalledWith throws when no match", () => {
    mock.url({ width: 100, height: 100 });
    expect(() => mock.assertCalledWith({ width: 999 })).toThrow("No placeholder call matched");
  });

  it("reset clears calls", () => {
    mock.url({ width: 10, height: 10 });
    mock.url({ width: 20, height: 20 });
    mock.reset();
    expect(mock.calls).toHaveLength(0);
  });
});

// ── DI Integration ──

describe("DI integration", () => {
  it("RgbaPlaceholder can be provided via app.use", () => {
    const provider = new RgbaPlaceholder();
    app.use(PlaceholderProvider, provider);
    const resolved = app.get(PlaceholderProvider);
    expect(resolved).toBe(provider);
    expect(resolved).toBeInstanceOf(RgbaPlaceholder);
  });

  it("MockPlaceholder can be provided via app.use", () => {
    const mock = new MockPlaceholder();
    app.use(PlaceholderProvider, mock);
    const resolved = app.get(PlaceholderProvider);
    expect(resolved).toBe(mock);
    expect(resolved).toBeInstanceOf(MockPlaceholder);
  });
});
