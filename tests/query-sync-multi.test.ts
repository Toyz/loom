/**
 * Several synced `@prop({ query })` accessors sharing one address bar.
 *
 * Every existing test for this drives hash mode, and hash mode cannot expose
 * the bug: `location.hash` is a single string, so the query comes back with
 * the path whether or not anyone meant it to. History mode read
 * `location.pathname` and dropped it, so each write started from a URL with no
 * parameters and rewrote the whole query string from its own single key --
 * three synced props left only whichever one was assigned last.
 *
 * So these run the same expectations against BOTH modes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LoomRouter } from "../src/router/router";
import { HashMode, HistoryMode } from "../src/router/mode";
import { prop } from "../src/store/decorators";

/** Path + query as it currently stands, whichever mode wrote it. */
const url = (mode: "hash" | "history") =>
  mode === "hash" ? location.hash.slice(1) : location.pathname + location.search;

const start = (mode: "hash" | "history", path: string) => {
  if (mode === "hash") location.hash = `#${path}`;
  else history.replaceState(null, "", path);
  return new LoomRouter({ mode });
};

describe("RouterMode.read", () => {
  it("hash mode returns the query with the path", () => {
    location.hash = "#/gallery?a=1&b=2";
    expect(new HashMode().read()).toBe("/gallery?a=1&b=2");
  });

  // The regression itself. read() is what setQueryParam merges into, so a
  // query-less return value means every write is a full replacement.
  it("history mode returns the query with the path", () => {
    history.replaceState(null, "", "/gallery?a=1&b=2");
    expect(new HistoryMode().read()).toBe("/gallery?a=1&b=2");
  });
});

for (const mode of ["hash", "history"] as const) {
  describe(`three query params — ${mode} mode`, () => {
    let router: LoomRouter;

    beforeEach(() => {
      router = start(mode, "/gallery");
    });

    it("accumulates three sequential writes into one query string", () => {
      router.setQueryParam("type", "animated");
      router.setQueryParam("page", "2");
      router.setQueryParam("q", "loom");

      const params = new URLSearchParams(url(mode).split("?")[1] ?? "");
      expect(params.get("type")).toBe("animated");
      expect(params.get("page")).toBe("2");
      expect(params.get("q")).toBe("loom");
    });

    it("keeps a query that was already in the URL on entry", () => {
      const r = start(mode, "/gallery?from=email");
      r.setQueryParam("page", "3");
      const params = new URLSearchParams(url(mode).split("?")[1] ?? "");
      expect(params.get("from")).toBe("email");
      expect(params.get("page")).toBe("3");
    });

    it("clearing one key leaves the other two", () => {
      router.setQueryParam("type", "animated");
      router.setQueryParam("page", "2");
      router.setQueryParam("q", "loom");
      router.setQueryParam("page", null);

      const params = new URLSearchParams(url(mode).split("?")[1] ?? "");
      expect(params.get("page")).toBeNull();
      expect(params.get("type")).toBe("animated");
      expect(params.get("q")).toBe("loom");
    });

    it("three synced props write to the same query string", () => {
      class Gallery {
        @prop({ query: "type", sync: true }) accessor type = "all";
        @prop({ query: "page", sync: true }) accessor page = 1;
        @prop({ query: "q", sync: true }) accessor search = "";
      }
      const g = new Gallery();
      g.type = "animated";
      g.page = 2;
      g.search = "loom";

      const params = new URLSearchParams(url(mode).split("?")[1] ?? "");
      expect(params.get("type")).toBe("animated");
      expect(params.get("page")).toBe("2");
      expect(params.get("q")).toBe("loom");
    });

    it("a prop returning to its default removes only its own key", () => {
      class Gallery {
        @prop({ query: "type", sync: true }) accessor type = "all";
        @prop({ query: "page", sync: true }) accessor page = 1;
      }
      const g = new Gallery();
      g.type = "animated";
      g.page = 2;
      g.page = 1; // back to the declared default

      const params = new URLSearchParams(url(mode).split("?")[1] ?? "");
      expect(params.get("page")).toBeNull();
      expect(params.get("type")).toBe("animated");
    });

    describe("debounced", () => {
      beforeEach(() => vi.useFakeTimers());
      afterEach(() => vi.useRealTimers());

      // Three timers expiring in the same tick still run one at a time, so
      // each one's read has to see what the previous one wrote.
      it("three debounced props flushing together all survive", () => {
        class Search {
          @prop({ query: "q", sync: { debounce: 50 } }) accessor q = "";
          @prop({ query: "sort", sync: { debounce: 50 } }) accessor sort = "rel";
          @prop({ query: "page", sync: { debounce: 50 } }) accessor page = 1;
        }
        const s = new Search();
        s.q = "loom";
        s.sort = "new";
        s.page = 4;

        vi.advanceTimersByTime(60);

        const params = new URLSearchParams(url(mode).split("?")[1] ?? "");
        expect(params.get("q")).toBe("loom");
        expect(params.get("sort")).toBe("new");
        expect(params.get("page")).toBe("4");
      });
    });
  });
}
