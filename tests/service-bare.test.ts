/**
 * `@service` used bare, which is the form the DI docs show.
 *
 * It was built with createDecorator, which always produces a factory. Under
 * that shape the runtime calls bare `@service` as `service(TheClass, context)`
 * and gets back the *inner* decorator function — and a class decorator's
 * return value replaces the class. So the class silently became an anonymous
 * arrow function: `new TheClass()` threw "is not a constructor" and `.name`
 * was empty, which is why the container reported `no provider for ` with
 * nothing after it.
 */
import { describe, it, expect } from "vitest";
import { app } from "../src/index";
import { service } from "../src/di/index";

describe("@service used bare", () => {
  it("leaves the class a constructor", () => {
    @service
    class Bare {
      id = "bare";
    }

    expect(typeof Bare).toBe("function");
    expect(Bare.name).toBe("Bare");
    expect(Bare.prototype).toBeDefined();
    expect(new Bare().id).toBe("bare");
  });

  it("registers it in the container", async () => {
    @service
    class BareRegistered {
      id = "reg";
    }

    await app.start();
    expect(app.get(BareRegistered).id).toBe("reg");
  });

  it("still supports the called form", async () => {
    @service()
    class Called {
      id = "called";
    }

    await app.start();
    expect(Called.name).toBe("Called");
    expect(app.get(Called).id).toBe("called");
  });

  it("still supports a name", async () => {
    @service("named-svc")
    class Named {
      id = "named";
    }

    await app.start();
    expect(Named.name).toBe("Named");
    expect(app.get(Named).id).toBe("named");
    expect(app.get("named-svc").id).toBe("named");
  });

  it("resolves the same singleton either way it was declared", async () => {
    @service
    class Single {
      n = 0;
    }
    await app.start();
    app.get(Single).n = 7;
    expect(app.get(Single).n).toBe(7);
  });
});
