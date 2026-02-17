/**
 * Tests: @form decorator — FormState creation & validation
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { LoomElement, component } from "../src";
import { form, createFormState } from "../src/element/form";
import type { FormState, FormSchema } from "../src/element/form";
import { cleanup, fixture } from "../src/testing";

let tagCounter = 0;
function nextTag() { return `test-form-${++tagCounter}`; }

afterEach(() => cleanup());

describe("@form", () => {

  describe("createFormState (unit)", () => {
    it("initializes fields to empty strings", () => {
      const schema: FormSchema<{ email: string; password: string }> = {
        email: {},
        password: {},
      };

      const state = createFormState(schema, () => {});

      expect(state.data.email).toBe("");
      expect(state.data.password).toBe("");
    });

    it("starts pristine — no errors until validate() is called", () => {
      const schema: FormSchema<{ email: string; password: string }> = {
        email: { validate: (v) => v.includes("@") || "Invalid email" },
        password: { validate: (v) => v.length >= 8 || "Min 8 chars" },
      };

      const state = createFormState(schema, () => {});

      // Pristine: valid is false (fields ARE invalid) but no errors surfaced yet
      expect(state.valid).toBe(false);
      expect(state.errors.email).toBeUndefined();
      expect(state.errors.password).toBeUndefined();

      // After explicit validate(), errors surface
      state.validate();
      expect(state.errors.email).toBe("Invalid email");
      expect(state.errors.password).toBe("Min 8 chars");
    });

    it("surfaces error for touched field after bind input", () => {
      const schema: FormSchema<{ email: string }> = {
        email: { validate: (v) => v.includes("@") || "Invalid email" },
      };

      const state = createFormState(schema, () => {});
      expect(state.errors.email).toBeUndefined(); // pristine

      // Type something invalid — error surfaces because field is now touched
      const handler = state.bind("email");
      handler({ target: { value: "nope" } } as any);
      expect(state.errors.email).toBe("Invalid email");

      // Type something valid — error clears
      handler({ target: { value: "test@example.com" } } as any);
      expect(state.valid).toBe(true);
      expect(state.errors.email).toBeUndefined();
    });

    it("transforms field values", () => {
      const schema: FormSchema<{ count: number }> = {
        count: { transform: (v) => Number(v) },
      };

      const state = createFormState(schema, () => {});

      // Simulate input
      const handler = state.bind("count");
      handler({ target: { value: "42" } } as any);

      expect(state.data.count).toBe(42);
      expect(typeof state.data.count).toBe("number");
    });

    it("tracks dirty state after changes via bind", () => {
      const schema: FormSchema<{ email: string }> = { email: {} };
      const state = createFormState(schema, () => {});

      expect(state.dirty).toBe(false);

      const handler = state.bind("email");
      handler({ target: { value: "changed@test.com" } } as any);

      expect(state.dirty).toBe(true);
    });

    it("reset clears touched state and errors", () => {
      const schema: FormSchema<{ email: string }> = {
        email: { validate: (v) => v.includes("@") || "Bad" },
      };
      const state = createFormState(schema, () => {});

      const handler = state.bind("email");
      handler({ target: { value: "nope" } } as any);
      expect(state.errors.email).toBe("Bad");
      expect(state.dirty).toBe(true);

      state.reset();
      expect(state.data.email).toBe("");
      expect(state.dirty).toBe(false);
      expect(state.errors.email).toBeUndefined(); // pristine again
    });

    it("validate() forces re-validation and returns result", () => {
      const schema: FormSchema<{ email: string }> = {
        email: { validate: (v) => v.includes("@") || "Invalid email" },
      };

      const state = createFormState(schema, () => {});
      expect(state.validate()).toBe(false);

      const handler = state.bind("email");
      handler({ target: { value: "valid@test.com" } } as any);
      expect(state.validate()).toBe(true);
    });

    it("bind() returns cached handlers", () => {
      const schema: FormSchema<{ email: string }> = { email: {} };
      const state = createFormState(schema, () => {});

      const h1 = state.bind("email");
      const h2 = state.bind("email");
      expect(h1).toBe(h2); // same reference
    });

    it("calls scheduleUpdate on bind input", () => {
      const fn = vi.fn();
      const schema: FormSchema<{ name: string }> = { name: {} };
      const state = createFormState(schema, fn);

      const handler = state.bind("name");
      handler({ target: { value: "hello" } } as any);
      expect(fn).toHaveBeenCalled();
    });
  });

  describe("decorator wiring", () => {
    it("accessor getter returns a FormState on connected element", async () => {
      const tag = nextTag();

      @component(tag)
      class El extends LoomElement {
        @form<{ email: string }>({ email: {} })
        accessor login!: FormState<{ email: string }>;
      }

      customElements.define(tag, El);
      const el = await fixture<El>(tag);

      expect((el as any).login).toBeTruthy();
      expect((el as any).login.valid).toBe(true);
      expect((el as any).login.data.email).toBe("");
    });

    it("works with validation and input binding", async () => {
      const tag = nextTag();

      @component(tag)
      class El extends LoomElement {
        @form<{ name: string }>({
          name: { validate: (v) => v.length >= 2 || "Too short" },
        })
        accessor info!: FormState<{ name: string }>;
      }

      customElements.define(tag, El);
      const el = await fixture<El>(tag);

      const info = (el as any).info;
      expect(info).toBeTruthy();
      expect(info.valid).toBe(false);
      expect(info.errors.name).toBeUndefined(); // pristine — no errors surfaced yet

      // Explicit validate surfaces errors
      info.validate();
      expect(info.errors.name).toBe("Too short");

      // Simulate valid input
      const handler = info.bind("name");
      handler({ target: { value: "Ada" } } as any);

      expect(info.valid).toBe(true);
      expect(info.data.name).toBe("Ada");
    });
  });
});
