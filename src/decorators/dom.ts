/**
 * Lazy shadow DOM querySelector.
 * ```ts
 * @query(".submit-btn") submitBtn!: HTMLButtonElement;
 * ```
 */
export function query(selector: string) {
  return (target: any, key: string) => {
    Object.defineProperty(target, key, {
      get() {
        return this.shadow.querySelector(selector);
      },
      configurable: true,
    });
  };
}

/**
 * Lazy shadow DOM querySelectorAll.
 * ```ts
 * @queryAll("input") inputs!: HTMLInputElement[];
 * ```
 */
export function queryAll(selector: string) {
  return (target: any, key: string) => {
    Object.defineProperty(target, key, {
      get() {
        return Array.from(this.shadow.querySelectorAll(selector));
      },
      configurable: true,
    });
  };
}
