import { CATCH_HANDLER, MOUNT_HANDLERS, UNMOUNT_HANDLERS } from "./symbols";

type CatchFn = (error: Error, element: any) => void;

/**
 * Error boundary. Wraps lifecycle methods with try/catch, renders fallback on error.
 * Named catch_ since `catch` is reserved.
 *
 * ```ts
 * @component("my-widget")
 * @catch_((err, el) => {
 *   el.shadow.replaceChildren(<div>{err.message}</div>);
 * })
 * class MyWidget extends LoomElement { ... }
 * ```
 */
export function catch_(handler: CatchFn) {
  return (ctor: any) => {
    (ctor as any)[CATCH_HANDLER] = handler;

    // Wrap update()
    const origUpdate = (ctor.prototype as any).update;
    if (origUpdate) {
      (ctor.prototype as any).update = function () {
        try {
          return origUpdate.call(this);
        } catch (err) {
          handler(err as Error, this);
        }
      };
    }

    // Wrap connectedCallback()
    const origConnect = (ctor.prototype as any).connectedCallback;
    if (origConnect) {
      (ctor.prototype as any).connectedCallback = function () {
        try {
          origConnect.call(this);
        } catch (err) {
          handler(err as Error, this);
        }
      };
    }
  };
}

/**
 * Async suspense. Wraps async methods to auto-manage loading/error state.
 * Expects the component to have @reactive loading and @reactive error fields.
 *
 * ```ts
 * @suspend()
 * async fetchUser() {
 *   const res = await fetch(`/api/users/${this.userId}`);
 *   this.user = await res.json();
 * }
 * ```
 */
export function suspend() {
  return (_target: any, _key: string, desc: PropertyDescriptor) => {
    const orig = desc.value;

    desc.value = async function (this: any, ...args: any[]) {
      this.loading = true;
      this.error = null;
      try {
        const result = await orig.apply(this, args);
        return result;
      } catch (err) {
        this.error = err as Error;
        const handler = this.constructor[CATCH_HANDLER];
        if (handler) handler(err as Error, this);
      } finally {
        this.loading = false;
      }
    };
  };
}

/**
 * Lifecycle: runs when element connects to the DOM.
 * Multiple @mount methods per class allowed. No need to call super.
 *
 * ```ts
 * @mount
 * setup() { this.ctx = this.canvas.getContext("2d"); }
 * ```
 */
export function mount(target: any, key: string): void {
  if (!target[MOUNT_HANDLERS]) target[MOUNT_HANDLERS] = [];
  target[MOUNT_HANDLERS].push(key);
}

/**
 * Lifecycle: runs when element disconnects from the DOM.
 * Multiple @unmount methods per class allowed. Runs BEFORE track() cleanup.
 *
 * ```ts
 * @unmount
 * saveState() { localStorage.setItem("state", JSON.stringify(this.state)); }
 * ```
 */
export function unmount(target: any, key: string): void {
  if (!target[UNMOUNT_HANDLERS]) target[UNMOUNT_HANDLERS] = [];
  target[UNMOUNT_HANDLERS].push(key);
}
