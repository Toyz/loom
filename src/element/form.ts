/**
 * Loom — @form<T> property decorator
 *
 * DOM-independent form state management with validation, transforms,
 * dirty tracking, and explicit template binding.
 *
 * ```ts
 * @form<LoginForm>({
 *   email:    { transform: toTrimmed, validate: v => v.includes("@") || "Invalid email" },
 *   password: { validate: v => v.length >= 8 || "Min 8 chars" },
 *   remember: { transform: toBoolean },
 * })
 * accessor login!: FormState<LoginForm>;
 *
 * update() {
 *   const result = this.login.validate();
 *   result.match({
 *     ok:  (data) => submit(data),
 *     err: (errors) => showErrors(errors),
 *   });
 * }
 * ```
 */

import { LoomResult } from "../result";


// ── Types ──

export interface FieldSchema<V = unknown> {
  /** Transform raw string value before storing (reuses @transform functions) */
  transform?: (raw: string) => V;
  /** Return true if valid, or an error string */
  validate?: (value: V) => true | string;
}

export type FormSchema<T> = {
  [K in keyof T]?: FieldSchema<T[K]>;
};

export interface FormState<T> {
  /** Current transformed values */
  readonly data: T;
  /** Field → error message (only populated for invalid fields) */
  readonly errors: Partial<Record<keyof T, string>>;
  /** True when all validated fields pass */
  readonly valid: boolean;
  /** True when any field has changed from initial values */
  readonly dirty: boolean;
  /** Reset all fields to their initial values */
  reset(): void;
  /** Manually trigger validation — returns LoomResult<T, errors> */
  validate(): LoomResult<T, Partial<Record<keyof T, string>>>;
  /** Returns an onInput event handler bound to a specific field */
  bind(field: keyof T): (e: Event) => void;
}

// ── Helpers ──

/**
 * Read a form element's value, handling checkboxes.
 */
function readInputValue(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  if (input instanceof HTMLInputElement && input.type === "checkbox") {
    return input.checked ? "true" : "false";
  }
  return input.value;
}

// ── Core ──

/**
 * Create a FormState<T> instance — pure reactive data, no DOM dependency.
 */
export function createFormState<T extends object>(
  schema: FormSchema<T>,
  scheduleUpdate: () => void,
): FormState<T> {
  // Initialize all fields to empty string (or transform of empty)
  const initial: Record<string, unknown> = {};
  const current: Record<string, unknown> = {};
  const errors: Partial<Record<keyof T, string>> = {};
  const touched = new Set<string>();
  let validatedAll = false;

  for (const key of Object.keys(schema)) {
    const fieldSchema = schema[key as keyof T];
    const raw = "";
    const transformed = fieldSchema?.transform ? fieldSchema.transform(raw) : raw;
    initial[key] = transformed;
    current[key] = transformed;
  }

  let isValid = true;

  // Compute initial validity (without surfacing errors)
  for (const key of Object.keys(schema)) {
    const fieldSchema = schema[key as keyof T];
    if (fieldSchema?.validate) {
      const result = fieldSchema.validate(current[key] as T[keyof T]);
      if (result !== true) isValid = false;
    }
  }

  // Validation — only surfaces errors for touched fields (or all if validate() was called)
  function runValidation(): boolean {
    let allValid = true;
    for (const key of Object.keys(schema)) {
      const fieldSchema = schema[key as keyof T];
      if (fieldSchema?.validate) {
        const result = fieldSchema.validate(current[key] as T[keyof T]);
        if (result === true) {
          delete errors[key as keyof T];
        } else {
          allValid = false;
          // Only surface error if field was touched or validate() was called
          if (touched.has(key) || validatedAll) {
            (errors as Record<string, string>)[key] = result;
          }
        }
      }
    }
    isValid = allValid;
    return allValid;
  }

  // Bind handlers cache
  const bindCache = new Map<string, (e: Event) => void>();

  const state: FormState<T> = {
    get data() {
      return current as unknown as T;
    },
    get errors() {
      return errors;
    },
    get valid() {
      return isValid;
    },
    get dirty() {
      for (const key of Object.keys(schema)) {
        if (current[key] !== initial[key]) return true;
      }
      return false;
    },
    reset() {
      for (const key of Object.keys(schema)) {
        current[key] = initial[key];
      }
      touched.clear();
      validatedAll = false;
      // Clear all errors on reset
      for (const key of Object.keys(errors)) {
        delete errors[key as keyof T];
      }
      scheduleUpdate();
    },
    validate(): LoomResult<T, Partial<Record<keyof T, string>>> {
      validatedAll = true;
      const valid = runValidation();
      scheduleUpdate();
      if (valid) return LoomResult.ok(current as unknown as T);
      return LoomResult.err({ ...errors });
    },
    bind(field: keyof T): (e: Event) => void {
      const key = field as string;
      if (!bindCache.has(key)) {
        bindCache.set(key, (e: Event) => {
          const input = e.target as HTMLInputElement;
          const raw = readInputValue(input);
          const fieldSchema = schema[field];
          const transformed = fieldSchema?.transform ? fieldSchema.transform(raw) : raw;
          current[key] = transformed;
          touched.add(key);
          runValidation();
          scheduleUpdate();
        });
      }
      return bindCache.get(key)!;
    },
  };

  return state;
}

// ── Decorator ──

/**
 * @form<T>(schema) — Auto-accessor decorator
 *
 * Creates a FormState<T> eagerly at class initialization.
 * No DOM dependency — use `.bind(field)` in your template for explicit binding.
 */
export function form<T extends object>(
  schema: FormSchema<T>,
) {
  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, FormState<T>>,
    context: ClassAccessorDecoratorContext<This, FormState<T>>,
  ): ClassAccessorDecoratorResult<This, FormState<T>> => {
    const stateKey = Symbol(`form:${String(context.name)}`);

    return {
      get(this: any): FormState<T> {
        if (!this[stateKey]) {
          const scheduleUpdate = () => this.scheduleUpdate?.();
          this[stateKey] = createFormState<T>(schema, scheduleUpdate);
        }
        return this[stateKey];
      },
      set(this: any, _val: FormState<T>) {
        // Ignore external sets — state is managed internally
      },
    };
  };
}
