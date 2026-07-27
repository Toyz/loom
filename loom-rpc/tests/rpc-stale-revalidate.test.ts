/**
 * staleTime must revalidate, not just flag.
 *
 * @rpc advertised stale-while-revalidate and only did the first half: once
 * staleTime elapsed, `.stale` flipped true and stayed there. Nothing refetched
 * until the args happened to change or someone called refetch() by hand, so a
 * query with staleTime set behaved exactly like one without -- it just told
 * you the data was old while continuing to show it forever.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { app, bus } from "@toyz/loom";
import { ApiStale } from "@toyz/loom/query";
import { RpcTransport, rpc } from "@toyz/loom-rpc";
import { MockTransport } from "@toyz/loom-rpc/testing";

class UserRouter {
  getUser(id: string): { id: string; name: string } { return null!; }
}

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

describe("@rpc staleTime revalidation", () => {
  let transport: MockTransport;

  beforeEach(() => {
    transport = new MockTransport();
    app.use(RpcTransport, transport);
  });

  /** Read .data until the first fetch has resolved. */
  async function settle(host: { user: { data: unknown } }) {
    for (let i = 0; i < 10 && host.user.data === undefined; i++) await tick();
    return host.user.data;
  }

  it("refetches once the data has gone stale", async () => {
    let n = 0;
    transport.mock(UserRouter, "getUser", () => ({ id: "1", name: `v${++n}` }));

    class Host {
      userId = "1";
      scheduleUpdate() {}
      @rpc(UserRouter, "getUser", { fn: (el: Host) => [el.userId], staleTime: 20 })
      accessor user!: any;
    }
    const host = new Host();

    expect(await settle(host)).toEqual({ id: "1", name: "v1" });

    // Past staleTime, with the args unchanged -- the case that never refetched.
    await tick(30);
    expect(host.user.stale).toBe(true);

    await tick(5);
    expect(host.user.data).toEqual({ id: "1", name: "v2" });
    expect(host.user.stale).toBe(false);
  });

  it("only flags when revalidate is false", async () => {
    let n = 0;
    transport.mock(UserRouter, "getUser", () => ({ id: "1", name: `v${++n}` }));

    class Host {
      userId = "1";
      scheduleUpdate() {}
      @rpc(UserRouter, "getUser", {
        fn: (el: Host) => [el.userId],
        staleTime: 20,
        revalidate: false,
      })
      accessor user!: any;
    }
    const host = new Host();
    await settle(host);

    await tick(30);
    expect(host.user.stale).toBe(true);
    await tick(10);
    expect(host.user.data).toEqual({ id: "1", name: "v1" });
    expect(n).toBe(1);
  });

  it("announces the transition on the bus", async () => {
    transport.mock(UserRouter, "getUser", () => ({ id: "1", name: "a" }));
    const seen: ApiStale[] = [];
    const off = bus.on(ApiStale, (e) => seen.push(e));

    class Host {
      userId = "1";
      scheduleUpdate() {}
      @rpc(UserRouter, "getUser", { fn: (el: Host) => [el.userId], staleTime: 20 })
      accessor user!: any;
    }
    const host = new Host();
    await settle(host);

    await tick(30);
    void host.user.stale;
    await tick(5);

    off();
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0]!.name).toBe("UserRouter.getUser");
    expect(seen[0]!.host).toBe(host);
  });
});
