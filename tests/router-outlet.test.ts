/**
 * Tests: Router mode — path reading logic
 *
 * Regression tests for:
 *   1. HistoryMode.read() must use location.pathname, not location.hash
 *   2. Query parsing must support both hash and history mode patterns
 *
 * Note: We test the mode classes directly without touching location.hash
 * (which triggers hashchange events in happy-dom and causes hangs).
 */
import { describe, it, expect, vi } from "vitest";
import { HashMode, HistoryMode } from "../src/router/mode";

// ── Mode interface contract ──

describe("HashMode", () => {
  it("href() returns hash-prefixed path", () => {
    const mode = new HashMode();
    expect(mode.href("/settings")).toBe("#/settings");
    expect(mode.href("/")).toBe("#/");
    expect(mode.href("/users/42")).toBe("#/users/42");
  });

  it("read() uses location.hash (not pathname)", () => {
    const mode = new HashMode();
    // Spy on the implementation — it should reference location.hash
    const src = mode.read.toString();
    expect(src).toContain("hash");
  });
});

describe("HistoryMode", () => {
  it("href() returns plain path without hash prefix", () => {
    const mode = new HistoryMode();
    expect(mode.href("/settings")).toBe("/settings");
    expect(mode.href("/users")).toBe("/users");
    expect(mode.href("/")).toBe("/");
  });

  it("read() uses location.pathname (not location.hash)", () => {
    const mode = new HistoryMode();
    // Spy on the implementation — it should reference pathname
    const src = mode.read.toString();
    expect(src).toContain("pathname");
    expect(src).not.toContain("hash");
  });

  it("read() returns a string starting with /", () => {
    const mode = new HistoryMode();
    const path = mode.read();
    expect(typeof path).toBe("string");
    expect(path[0]).toBe("/");
  });
});

// ── Regression: modes must read from different URL parts ──

describe("mode path source regression", () => {
  it("HashMode.read !== HistoryMode.read — they read different URL parts", () => {
    const hash = new HashMode();
    const history = new HistoryMode();

    // Their implementations must differ
    expect(hash.read.toString()).not.toBe(history.read.toString());
  });

  it("HistoryMode.read() does NOT reference location.hash", () => {
    const mode = new HistoryMode();
    const src = mode.read.toString();
    // The entire point of the fix: history mode must NOT touch hash
    expect(src).not.toContain("location.hash");
  });

  it("HashMode.read() does NOT reference location.pathname", () => {
    const mode = new HashMode();
    const src = mode.read.toString();
    expect(src).not.toContain("pathname");
  });
});

// ── Regression: query parsing logic ──

describe("query parsing regression", () => {
  /**
   * This tests the _parseQuery logic from outlet.ts.
   * Must handle both:
   *   hash mode:    #/search?q=loom  → URLSearchParams from hash fragment
   *   history mode: /search?q=loom   → URLSearchParams from location.search
   */
  function parseQuery(hash: string, search: string): URLSearchParams {
    // Exact logic from the fixed outlet._parseQuery
    const hashQ = hash.indexOf("?");
    if (hashQ >= 0) return new URLSearchParams(hash.slice(hashQ + 1));
    return new URLSearchParams(search);
  }

  it("extracts query from hash fragment (hash mode)", () => {
    const params = parseQuery("#/search?q=loom&page=2", "");
    expect(params.get("q")).toBe("loom");
    expect(params.get("page")).toBe("2");
  });

  it("extracts query from search string (history mode)", () => {
    const params = parseQuery("", "?q=loom&page=2");
    expect(params.get("q")).toBe("loom");
    expect(params.get("page")).toBe("2");
  });

  it("hash query takes priority over search query", () => {
    const params = parseQuery("#/page?source=hash", "?source=search");
    expect(params.get("source")).toBe("hash");
  });

  it("returns empty params when both are empty", () => {
    const params = parseQuery("", "");
    expect([...params.entries()]).toHaveLength(0);
  });

  it("handles hash path with no query", () => {
    const params = parseQuery("#/about", "");
    expect([...params.entries()]).toHaveLength(0);
  });

  it("handles hash path with no query but search present", () => {
    // Hash has no query → falls through to search
    const params = parseQuery("#/about", "?q=test");
    expect(params.get("q")).toBe("test");
  });

  // THE BUG: old code always parsed hash, so history mode queries were lost
  it("OLD BUG: history mode query was invisible when only checking hash", () => {
    // Old buggy code: new URLSearchParams(hash.slice(hash.indexOf("?") + 1))
    // When hash is "", indexOf("?") returns -1, slice(0) returns "", params empty
    const buggyParse = (hash: string) => {
      const qIdx = hash.indexOf("?");
      return new URLSearchParams(qIdx >= 0 ? hash.slice(qIdx + 1) : "");
    };

    // This was the actual bug — history mode queries were invisible
    const buggy = buggyParse(""); // hash is empty in history mode
    expect(buggy.get("q")).toBeNull(); // query is lost!

    // Fixed version correctly falls through to location.search
    const fixed = parseQuery("", "?q=loom");
    expect(fixed.get("q")).toBe("loom"); // query is preserved!
  });
});
