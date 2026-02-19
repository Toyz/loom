/**
 * Tests — LoomResult<T, E>
 */
import { describe, it, expect, vi } from "vitest";
import { LoomResult } from "../src/result";

describe("LoomResult", () => {
  // ── Static constructors ──

  describe("ok()", () => {
    it("creates an Ok with data", () => {
      const r = LoomResult.ok(42);
      expect(r.ok).toBe(true);
      expect(r.data).toBe(42);
      expect(r.error).toBeUndefined();
    });

    it("creates a void Ok with no args", () => {
      const r = LoomResult.ok();
      expect(r.ok).toBe(true);
      expect(r.data).toBeUndefined();
    });
  });

  describe("err()", () => {
    it("creates an Err with error", () => {
      const e = new Error("fail");
      const r = LoomResult.err(e);
      expect(r.ok).toBe(false);
      expect(r.data).toBeUndefined();
      expect(r.error).toBe(e);
    });

    it("works with string errors", () => {
      const r = LoomResult.err("not found");
      expect(r.ok).toBe(false);
      expect(r.error).toBe("not found");
    });
  });

  describe("OK constant", () => {
    it("is a pre-allocated void Ok", () => {
      expect(LoomResult.OK.ok).toBe(true);
      expect(LoomResult.OK.data).toBeUndefined();
      expect(LoomResult.OK.error).toBeUndefined();
    });

    it("is the same reference every time", () => {
      expect(LoomResult.OK).toBe(LoomResult.OK);
    });
  });

  describe("value getter", () => {
    it("returns same value as .data on Ok", () => {
      const r = LoomResult.ok(42);
      expect(r.value).toBe(42);
      expect(r.value).toBe(r.data);
    });

    it("returns undefined on Err", () => {
      const r = LoomResult.err(new Error("fail"));
      expect(r.value).toBeUndefined();
    });

    it("works with complex types", () => {
      const obj = { name: "test", items: [1, 2] };
      const r = LoomResult.ok(obj);
      expect(r.value).toBe(obj);
      expect(r.value!.name).toBe("test");
    });
  });

  // ── Combinators ──

  describe("unwrap()", () => {
    it("returns data on Ok", () => {
      expect(LoomResult.ok("hello").unwrap()).toBe("hello");
    });

    it("throws on Err", () => {
      const e = new Error("boom");
      expect(() => LoomResult.err(e).unwrap()).toThrow(e);
    });
  });

  describe("unwrap_or()", () => {
    it("returns data on Ok", () => {
      expect(LoomResult.ok(10).unwrap_or(0)).toBe(10);
    });

    it("returns fallback on Err", () => {
      expect(LoomResult.err<Error>(new Error()).unwrap_or(0 as never)).toBe(0);
    });
  });

  describe("map()", () => {
    it("transforms Ok value", () => {
      const r = LoomResult.ok(5).map(x => x * 2);
      expect(r.ok).toBe(true);
      expect(r.data).toBe(10);
    });

    it("passes Err through unchanged", () => {
      const e = new Error("fail");
      const r = LoomResult.err(e).map(() => 999);
      expect(r.ok).toBe(false);
      expect(r.error).toBe(e);
    });
  });

  describe("map_err()", () => {
    it("transforms Err value", () => {
      const r = LoomResult.err("err").map_err(s => `wrapped: ${s}`);
      expect(r.ok).toBe(false);
      expect(r.error).toBe("wrapped: err");
    });

    it("passes Ok through unchanged", () => {
      const r = LoomResult.ok(42).map_err(() => "nope");
      expect(r.ok).toBe(true);
      expect(r.data).toBe(42);
    });
  });

  describe("and_then()", () => {
    it("chains on Ok", () => {
      const r: LoomResult<number, string> = LoomResult.ok<number>(5).and_then(x =>
        x > 0 ? LoomResult.ok(x * 10) : LoomResult.err("negative"),
      );
      expect(r.ok).toBe(true);
      expect(r.data).toBe(50);
    });

    it("short-circuits on Err", () => {
      const r = LoomResult.err<string>("fail").and_then(() => LoomResult.ok(999));
      expect(r.ok).toBe(false);
      expect(r.error).toBe("fail");
    });
  });

  describe("match()", () => {
    it("calls ok branch on Ok", () => {
      const result = LoomResult.ok("hello").match({
        ok: (v) => `got: ${v}`,
        err: () => "nope",
      });
      expect(result).toBe("got: hello");
    });

    it("calls err branch on Err", () => {
      const result = LoomResult.err("boom").match({
        ok: () => "nope",
        err: (e) => `error: ${e}`,
      });
      expect(result).toBe("error: boom");
    });

    it("returns the branch value (not void)", () => {
      const num: number = LoomResult.ok(5).match({
        ok: (v) => v * 2,
        err: () => -1,
      });
      expect(num).toBe(10);
    });

    // ── Extensible match ──

    it("accepts extra branches without error (Ok path)", () => {
      const result = LoomResult.ok("data").match({
        ok: (v) => `ok: ${v}`,
        err: () => "err",
        loading: () => "loading",  // extra branch — should be accepted
      });
      // Base LoomResult ignores 'loading', calls ok branch
      expect(result).toBe("ok: data");
    });

    it("accepts extra branches without error (Err path)", () => {
      const result = LoomResult.err(new Error("fail")).match({
        ok: () => "ok",
        err: (e) => `err: ${e.message}`,
        loading: () => "loading",
      });
      expect(result).toBe("err: fail");
    });

    it("ignores extra branches — base only handles ok/err", () => {
      const loading = vi.fn(() => "loading");
      const result = LoomResult.ok(42).match({
        ok: (v) => `value: ${v}`,
        err: () => "error",
        loading,
      });
      expect(result).toBe("value: 42");
      expect(loading).not.toHaveBeenCalled(); // base never calls extras
    });

    it("accepts multiple extra branches", () => {
      const result = LoomResult.ok("x").match({
        ok: (v) => v,
        err: () => "e",
        loading: () => "l",
        retrying: () => "r",
        stale: () => "s",
      });
      expect(result).toBe("x");
    });
  });

  describe("fromPromise()", () => {
    it("wraps resolved promise as Ok", async () => {
      const r = await LoomResult.fromPromise(Promise.resolve(42));
      expect(r.ok).toBe(true);
      expect(r.data).toBe(42);
    });

    it("wraps rejected promise as Err", async () => {
      const e = new Error("network");
      const r = await LoomResult.fromPromise(Promise.reject(e));
      expect(r.ok).toBe(false);
      expect(r.error).toBe(e);
    });

    it("works with fetch-like promises", async () => {
      const r = await LoomResult.fromPromise(
        Promise.resolve({ status: 200, body: "ok" }),
      );
      expect(r.ok).toBe(true);
      expect(r.data).toEqual({ status: 200, body: "ok" });
    });
  });
});
