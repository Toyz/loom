/**
 * router.setQueryParam — the URL writer behind `@prop({ query, sync })`.
 *
 * Also reachable directly, which is where the empty-string case bit: the
 * accessor mapped "" to a removal before calling in, so the router itself was
 * never asked to and happily wrote `?q=`.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { LoomRouter } from "../src/router/router";

let router: LoomRouter;

beforeEach(() => {
  router = new LoomRouter({ mode: "hash" });
});

describe("setQueryParam", () => {
  it("removes the key for an empty string", () => {
    location.hash = "#/gallery?q=loom&type=animated";
    router.setQueryParam("q", "");
    // `?q=` is indistinguishable from absent to anything reading it, and it
    // survives every round trip -- so it accumulates.
    expect(location.hash).not.toContain("q=");
    expect(location.hash).toContain("type=animated");
  });

  it("removes the key for null", () => {
    location.hash = "#/gallery?q=loom&type=animated";
    router.setQueryParam("type", null);
    expect(location.hash).not.toContain("type=");
    expect(location.hash).toContain("q=loom");
  });

  it("sets a real value", () => {
    location.hash = "#/gallery";
    router.setQueryParam("page", "2");
    expect(location.hash).toContain("page=2");
  });

  it("edits one key without disturbing the others", () => {
    location.hash = "#/gallery?a=1&b=2&c=3";
    router.setQueryParam("b", "changed");
    expect(location.hash).toContain("a=1");
    expect(location.hash).toContain("b=changed");
    expect(location.hash).toContain("c=3");
  });

  it("drops the whole query string once the last key goes", () => {
    location.hash = "#/gallery?only=1";
    router.setQueryParam("only", null);
    expect(location.hash).not.toContain("?");
  });

  it("leaves the path alone", () => {
    location.hash = "#/deep/nested/path?x=1";
    router.setQueryParam("x", "2");
    expect(location.hash).toContain("/deep/nested/path");
  });
});
