/**
 * @permission — reactive Permissions API state.
 *
 * The cases that matter are the unhappy ones: an engine without
 * navigator.permissions, a name it does not implement (query() rejects with a
 * TypeError), and a component that disconnects before the async query
 * resolves — which must not attach a listener or write to a detached element.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LoomElement, component } from "../src/index";
import { cleanup } from "../src/testing";
import { permission, Permission, type LoomPermissionState } from "../src/element/permission";

const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

/** A PermissionStatus stand-in whose state can be driven from a test. */
function fakeStatus(state: PermissionState) {
  const listeners = new Set<() => void>();
  return {
    status: {
      state,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    } as unknown as PermissionStatus,
    change(next: PermissionState) {
      (this.status as any).state = next;
      listeners.forEach((fn) => fn());
    },
    get listenerCount() { return listeners.size; },
  };
}

const originalPermissions = (navigator as any).permissions;
afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, "permissions", {
    value: originalPermissions, configurable: true, writable: true,
  });
  vi.restoreAllMocks();
});

function setPermissions(impl: any) {
  Object.defineProperty(navigator, "permissions", {
    value: impl, configurable: true, writable: true,
  });
}

let n = 0;
const nextTag = () => `perm-host-${n++}`;

describe("@permission", () => {
  it("reflects the queried state", async () => {
    const f = fakeStatus("granted");
    setPermissions({ query: vi.fn().mockResolvedValue(f.status) });

    const tag = nextTag();
    @component(tag)
    class Host extends LoomElement {
      @permission("geolocation") accessor geo: LoomPermissionState = "prompt";
      update() { return document.createTextNode(this.geo); }
    }

    customElements.define(tag, Host);
    const el = document.createElement(tag) as Host;
    document.body.appendChild(el);
    await tick(10);

    expect(el.geo).toBe("granted");
    el.remove();
  });

  it("updates when the permission changes", async () => {
    const f = fakeStatus("prompt");
    setPermissions({ query: vi.fn().mockResolvedValue(f.status) });

    const tag = nextTag();
    @component(tag)
    class Host extends LoomElement {
      @permission("notifications") accessor perm: LoomPermissionState = "prompt";
      update() { return document.createTextNode(this.perm); }
    }

    customElements.define(tag, Host);
    const el = document.createElement(tag) as Host;
    document.body.appendChild(el);
    await tick(10);
    expect(el.perm).toBe("prompt");

    f.change("denied");
    await tick(10);
    expect(el.perm).toBe("denied");
    el.remove();
  });

  it("reports unsupported when navigator.permissions is absent", async () => {
    setPermissions(undefined);

    const tag = nextTag();
    @component(tag)
    class Host extends LoomElement {
      @permission("geolocation") accessor geo: LoomPermissionState = "prompt";
      update() { return document.createTextNode(this.geo); }
    }

    customElements.define(tag, Host);
    const el = document.createElement(tag) as Host;
    document.body.appendChild(el);
    await tick(10);

    // Not "denied": a dead end and "cannot tell" need different UI.
    expect(el.geo).toBe("unsupported");
    el.remove();
  });

  it("reports unsupported when query() rejects for an unknown name", async () => {
    setPermissions({ query: vi.fn().mockRejectedValue(new TypeError("bad name")) });

    const tag = nextTag();
    @component(tag)
    class Host extends LoomElement {
      @permission("camera") accessor cam: LoomPermissionState = "prompt";
      update() { return document.createTextNode(this.cam); }
    }

    customElements.define(tag, Host);
    const el = document.createElement(tag) as Host;
    document.body.appendChild(el);
    await tick(10);

    expect(el.cam).toBe("unsupported");
    el.remove();
  });

  it("holds the declared initial value until the query resolves", async () => {
    let release!: (s: PermissionStatus) => void;
    setPermissions({ query: () => new Promise((r) => (release = r as any)) });

    const tag = nextTag();
    @component(tag)
    class Host extends LoomElement {
      @permission("geolocation") accessor geo: LoomPermissionState = "prompt";
      update() { return document.createTextNode(this.geo); }
    }

    customElements.define(tag, Host);
    const el = document.createElement(tag) as Host;
    document.body.appendChild(el);
    await tick();
    expect(el.geo).toBe("prompt");

    release(fakeStatus("granted").status);
    await tick(10);
    expect(el.geo).toBe("granted");
    el.remove();
  });

  it("does not attach a listener if it disconnects before the query resolves", async () => {
    const f = fakeStatus("granted");
    let release!: (s: PermissionStatus) => void;
    setPermissions({ query: () => new Promise((r) => (release = r as any)) });

    const tag = nextTag();
    @component(tag)
    class Host extends LoomElement {
      @permission("geolocation") accessor geo: LoomPermissionState = "prompt";
      update() { return document.createTextNode(this.geo); }
    }

    customElements.define(tag, Host);
    const el = document.createElement(tag) as Host;
    document.body.appendChild(el);
    await tick();
    el.remove();               // gone before the answer arrives

    release(f.status);
    await tick(10);

    expect(f.listenerCount).toBe(0);
    expect(el.geo).toBe("prompt");   // nothing written to a detached element
  });

  it("removes its listener on disconnect", async () => {
    const f = fakeStatus("granted");
    setPermissions({ query: vi.fn().mockResolvedValue(f.status) });

    const tag = nextTag();
    @component(tag)
    class Host extends LoomElement {
      @permission("geolocation") accessor geo: LoomPermissionState = "prompt";
      update() { return document.createTextNode(this.geo); }
    }

    customElements.define(tag, Host);
    const el = document.createElement(tag) as Host;
    document.body.appendChild(el);
    await tick(10);
    expect(f.listenerCount).toBe(1);

    el.remove();
    await tick(10);
    expect(f.listenerCount).toBe(0);
  });
});

describe("Permission registry", () => {
  it("works as the decorator argument", async () => {
    const f = fakeStatus("granted");
    const query = vi.fn().mockResolvedValue(f.status);
    setPermissions({ query });

    const tag = nextTag();
    @component(tag)
    class Host extends LoomElement {
      @permission(Permission.Geolocation)
      accessor geo: LoomPermissionState = "prompt";
      update() { return document.createTextNode(this.geo); }
    }

    customElements.define(tag, Host);
    const el = document.createElement(tag) as Host;
    document.body.appendChild(el);
    await tick(10);

    // the constant resolves to the string the API actually expects
    expect(query).toHaveBeenCalledWith({ name: "geolocation" });
    expect(el.geo).toBe("granted");
    el.remove();
  });

  it("still accepts a raw string, including names not in the registry", async () => {
    const f = fakeStatus("prompt");
    const query = vi.fn().mockResolvedValue(f.status);
    setPermissions({ query });

    const tag = nextTag();
    @component(tag)
    class Host extends LoomElement {
      @permission("compute-pressure")
      accessor cpu: LoomPermissionState = "prompt";
      update() { return document.createTextNode(this.cpu); }
    }

    customElements.define(tag, Host);
    const el = document.createElement(tag) as Host;
    document.body.appendChild(el);
    await tick(10);

    expect(query).toHaveBeenCalledWith({ name: "compute-pressure" });
    el.remove();
  });

  it("holds only lower-case wire names, never the friendly key", () => {
    for (const value of Object.values(Permission)) {
      expect(value).toBe(value.toLowerCase());
      expect(value).not.toContain(" ");
    }
  });

  it("has no duplicate values", () => {
    const values = Object.values(Permission);
    expect(new Set(values).size).toBe(values.length);
  });
});
