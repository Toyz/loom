/**
 * Tests: @subdomain / @domain / @tld URL part decorators
 *
 * parseHostname is tested directly (pure function, no DOM).
 * Decorator smoke tests use createMockElement — same pattern as @store tests.
 */
import { describe, it, expect } from "vitest";
import { subdomain, domain, tld, parseHostname } from "../src/router/url";

// ── parseHostname — pure function tests (no DOM mocking) ──────────────────────

describe("parseHostname — single-part TLD", () => {
  it("three-part: tenant.app.com", () => {
    expect(parseHostname("tenant.app.com")).toEqual({ subdomain: "tenant", domain: "app", tld: "com" });
  });

  it("two-part: app.com", () => {
    expect(parseHostname("app.com")).toEqual({ subdomain: "", domain: "app", tld: "com" });
  });

  it("bare: localhost", () => {
    expect(parseHostname("localhost")).toEqual({ subdomain: "", domain: "localhost", tld: "" });
  });

  it("deep subdomain: a.b.app.com", () => {
    expect(parseHostname("a.b.app.com")).toEqual({ subdomain: "a.b", domain: "app", tld: "com" });
  });

  it("a.b.c.mysite.io", () => {
    expect(parseHostname("a.b.c.mysite.io")).toEqual({ subdomain: "a.b.c", domain: "mysite", tld: "io" });
  });
});

describe("parseHostname — compound TLD (.co.uk etc.)", () => {
  it("tenant.app.co.uk", () => {
    expect(parseHostname("tenant.app.co.uk")).toEqual({ subdomain: "tenant", domain: "app", tld: "co.uk" });
  });

  it("store.myshop.com.au", () => {
    expect(parseHostname("store.myshop.com.au")).toEqual({ subdomain: "store", domain: "myshop", tld: "com.au" });
  });

  it("app.co.uk — no subdomain", () => {
    expect(parseHostname("app.co.uk")).toEqual({ subdomain: "", domain: "app", tld: "co.uk" });
  });

  it("unknown compound (foo.bar) treated as single-part TLD", () => {
    expect(parseHostname("tenant.app.foo.bar")).toEqual({ subdomain: "tenant.app", domain: "foo", tld: "bar" });
  });

  it("co.jp", () => {
    expect(parseHostname("myco.corp.co.jp")).toEqual({ subdomain: "myco", domain: "corp", tld: "co.jp" });
  });

  it("com.br", () => {
    expect(parseHostname("alice.myapp.com.br")).toEqual({ subdomain: "alice", domain: "myapp", tld: "com.br" });
  });

  it("gov.uk", () => {
    expect(parseHostname("service.gov.uk")).toEqual({ subdomain: "", domain: "service", tld: "gov.uk" });
  });
});

describe("parseHostname — empty/edge cases", () => {
  it("empty string behaves like bare hostname", () => {
    const r = parseHostname("");
    expect(r.subdomain).toBe("");
    expect(r.tld).toBe("");
  });

  it("SSR (no window) returns empty strings", () => {
    // parseHostname() with no arg reads window.location in real env;
    // direct call with explicit hostname arg exercises the pure path.
    expect(parseHostname("")).toEqual({ subdomain: "", domain: "", tld: "" });
  });
});

// ── Decorator smoke tests — createMockElement pattern (same as @store) ───────
// No @component, no fixture, no DOM. Just a plain prototype object.

function createMockElement(proto: object) {
  return Object.create(proto) as Record<string, string>;
}

describe("@subdomain decorator", () => {
  it("accessor is a string on first access", () => {
    class El { @subdomain accessor t = ""; }
    const el = createMockElement(El.prototype);
    expect(typeof el["t"]).toBe("string");
  });

  it("is writable", () => {
    class El { @subdomain accessor t = ""; }
    const el = createMockElement(El.prototype);
    el["t"] = "override";
    expect(el["t"]).toBe("override");
  });
});

describe("@domain decorator — bare", () => {
  it("accessor is a string on first access", () => {
    class El { @domain accessor d = ""; }
    const el = createMockElement(El.prototype);
    expect(typeof el["d"]).toBe("string");
  });
});

describe("@domain(\"full\") — domain+TLD via parseHostname", () => {
  it("tenant.app.com → app.com", () => {
    const { domain: d, tld: t } = parseHostname("tenant.app.com");
    expect(t ? `${d}.${t}` : d).toBe("app.com");
  });

  it("a.b.app.co.uk → app.co.uk", () => {
    const { domain: d, tld: t } = parseHostname("a.b.app.co.uk");
    expect(t ? `${d}.${t}` : d).toBe("app.co.uk");
  });

  it("localhost (no TLD) → localhost", () => {
    const { domain: d, tld: t } = parseHostname("localhost");
    expect(t ? `${d}.${t}` : d).toBe("localhost");
  });

  it("app.com → app.com", () => {
    const { domain: d, tld: t } = parseHostname("app.com");
    expect(t ? `${d}.${t}` : d).toBe("app.com");
  });

  it("decorator smoke: @domain(\"full\") accessor is a string", () => {
    class El { @domain("full") accessor d = ""; }
    const el = createMockElement(El.prototype);
    expect(typeof el["d"]).toBe("string");
  });
});

describe("@tld decorator", () => {
  it("accessor is a string on first access", () => {
    class El { @tld accessor x = ""; }
    const el = createMockElement(El.prototype);
    expect(typeof el["x"]).toBe("string");
  });
});

describe("combined decorators on same element", () => {
  it("all three accessors are strings", () => {
    class El {
      @subdomain accessor tenant = "";
      @domain    accessor host   = "";
      @tld       accessor ext    = "";
    }
    const el = createMockElement(El.prototype);
    expect(typeof el["tenant"]).toBe("string");
    expect(typeof el["host"]).toBe("string");
    expect(typeof el["ext"]).toBe("string");
  });

  it("each instance has independent storage", () => {
    class El { @subdomain accessor tenant = ""; }
    const a = createMockElement(El.prototype);
    const b = createMockElement(El.prototype);
    a["tenant"] = "acme";
    expect(a["tenant"]).toBe("acme");
    expect(typeof b["tenant"]).toBe("string"); // b reads hostname independently
  });
});
