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
      expect(state.validate().ok).toBe(false);

      const handler = state.bind("email");
      handler({ target: { value: "valid@test.com" } } as any);
      expect(state.validate().ok).toBe(true);
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

  describe("edge cases", () => {
    it("handles checkbox inputs (checked → 'true', unchecked → 'false')", () => {
      const schema: FormSchema<{ remember: boolean }> = {
        remember: { transform: (v) => v === "true" },
      };
      const state = createFormState(schema, () => {});

      const handler = state.bind("remember");
      // Use a real HTMLInputElement so instanceof check passes in readInputValue
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";

      checkbox.checked = true;
      handler({ target: checkbox } as any);
      expect(state.data.remember).toBe(true);

      checkbox.checked = false;
      handler({ target: checkbox } as any);
      expect(state.data.remember).toBe(false);
    });

    it("dirty is false when value changes back to initial", () => {
      const schema: FormSchema<{ name: string }> = { name: {} };
      const state = createFormState(schema, () => {});

      const handler = state.bind("name");
      handler({ target: { value: "changed" } } as any);
      expect(state.dirty).toBe(true);

      handler({ target: { value: "" } } as any); // back to initial
      expect(state.dirty).toBe(false);
    });

    it("multi-field: valid only when ALL fields pass", () => {
      const schema: FormSchema<{ a: string; b: string }> = {
        a: { validate: (v) => v.length > 0 || "Required" },
        b: { validate: (v) => v.length > 0 || "Required" },
      };
      const state = createFormState(schema, () => {});
      expect(state.valid).toBe(false);

      state.bind("a")({ target: { value: "ok" } } as any);
      expect(state.valid).toBe(false); // b still invalid

      state.bind("b")({ target: { value: "ok" } } as any);
      expect(state.valid).toBe(true);
    });

    it("validate() then input — errors clear for valid touched fields", () => {
      const schema: FormSchema<{ email: string }> = {
        email: { validate: (v) => v.includes("@") || "Bad" },
      };
      const state = createFormState(schema, () => {});

      // Force all errors visible
      state.validate();
      expect(state.errors.email).toBe("Bad");

      // Fix the field
      state.bind("email")({ target: { value: "a@b.c" } } as any);
      expect(state.errors.email).toBeUndefined();
      expect(state.valid).toBe(true);
    });

    it("double reset is idempotent", () => {
      const schema: FormSchema<{ name: string }> = { name: {} };
      const state = createFormState(schema, () => {});

      state.bind("name")({ target: { value: "x" } } as any);
      state.reset();
      state.reset(); // should not throw or corrupt
      expect(state.data.name).toBe("");
      expect(state.dirty).toBe(false);
    });

    it("fields without schema entries are ignored gracefully", () => {
      const schema: FormSchema<{ email: string }> = { email: {} };
      const state = createFormState(schema, () => {});
      expect(Object.keys(state.data as any)).toEqual(["email"]);
    });

    it("transform + validate pipeline runs in correct order", () => {
      const calls: string[] = [];
      const schema: FormSchema<{ num: number }> = {
        num: {
          transform: (v) => { calls.push("transform"); return Number(v); },
          validate: (v) => { calls.push("validate"); return v > 0 || "Must be positive"; },
        },
      };
      const state = createFormState(schema, () => {});

      state.bind("num")({ target: { value: "5" } } as any);
      // Init runs transform+validate, then bind runs transform+validate
      expect(calls).toEqual(["transform", "validate", "transform", "validate"]);
    });

    it("scheduleUpdate fires on validate() even when already valid", () => {
      const fn = vi.fn();
      const schema: FormSchema<{ name: string }> = { name: {} };
      const state = createFormState(schema, fn);

      fn.mockClear();
      state.validate();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("scheduleUpdate fires on reset()", () => {
      const fn = vi.fn();
      const schema: FormSchema<{ name: string }> = { name: {} };
      const state = createFormState(schema, fn);

      fn.mockClear();
      state.reset();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
