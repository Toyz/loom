/**
 * `sync` is only reachable where it means something.
 *
 * It writes a *query key* back to the URL. A path param cannot be written
 * without changing the route, and route meta is static config, so `sync` on
 * either is not a preference the runtime should quietly ignore -- it is a
 * mistake the type refuses. Same for the whole-query decompose, where writing
 * back would mean diffing an object.
 *
 * The @ts-expect-error lines are the assertion, checked by `npm run
 * test:types`. One that stops being an error fails that run.
 */
import { describe, it, expect } from "vitest";
import { prop, params, routeQuery, routeMeta } from "../src/store/decorators.js";

class Valid {
  @prop({ query: "type", sync: true }) accessor filter = "all";
  @prop({ query: "q", sync: { debounce: 300 } }) accessor query = "";
  @prop({ query: "page", sync: { history: "push", includeDefault: true } }) accessor page = 1;

  // Still fine without sync -- one-way is the default and nothing changed.
  @prop({ query: "tab" }) accessor tab = "general";
  @prop({ param: "id" }) accessor id = "";
  @prop({ params }) accessor allParams!: Record<string, string>;
  @prop({ query: routeQuery }) accessor allQuery!: Record<string, string>;
  @prop({ meta: routeMeta }) accessor allMeta!: Record<string, unknown>;
}

class Invalid {
  // @ts-expect-error a path param cannot be written back without re-routing
  @prop({ param: "id", sync: true }) accessor id = "";

  // @ts-expect-error route meta is static config, not URL state
  @prop({ meta: "layout", sync: true }) accessor layout = "";

  // @ts-expect-error writing the whole query object back would mean diffing it
  @prop({ query: routeQuery, sync: true }) accessor all!: Record<string, string>;

  // @ts-expect-error param and query are different bindings, not a combination
  @prop({ param: "id", query: "type" }) accessor mixed = "";
}

describe("query sync typing", () => {
  it("compiles the valid forms and rejects the rest", () => {
    expect(Valid).toBeTruthy();
    expect(Invalid).toBeTruthy();
  });
});
