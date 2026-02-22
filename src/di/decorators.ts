/**
 * Loom — DI decorators (TC39 Stage 3)
 *
 * @service — Auto-instantiated singleton, registered on app.start()
 *            Optionally accepts a minification-safe name: @service("MyService")
 * @inject  — Auto-accessor dependency injection (property mode only)
 * @factory — Method decorator, return value registered as a provider
 *
 * Note: TC39 does not support parameter decorators.
 * Use @inject as a property accessor: `@inject(Foo) accessor foo!: Foo;`
 */

import { app } from "../app";
import { createDecorator } from "../decorators/create";
import { SERVICE_NAME } from "../decorators/symbols";

/**
 * Auto-instantiated singleton. Registered on app.start().
 * Optionally accepts a minification-safe name.
 *
 * ```ts
 * @service
 * class BookmarkStore extends CollectionStore<Bookmark> { ... }
 *
 * @service("UserService")
 * class UserService { ... }
 * ```
 */
export const service = createDecorator<[name?: string]>((ctor, name?) => {
  if (name) (ctor as any)[SERVICE_NAME.key] = name;
  app.registerService(ctor);
}, { class: true });

/**
 * Resolve the display name for a service class.
 * Returns the @service("name") value if present, otherwise class.name.
 */
export function resolveServiceName(cls: new (...args: any[]) => any): string {
  return (cls as any)[SERVICE_NAME.key] ?? cls.name;
}

/**
 * Property-mode dependency injection via auto-accessor.
 * Resolves lazily from the DI container on first access.
 *
 * ```ts
 * @inject(AuthService) accessor auth!: AuthService;
 * @inject("AuthService") accessor auth!: AuthService;
 * ```
 */
export function inject<T = unknown>(key: (new (...args: unknown[]) => T) | string) {
  return <This extends object>(
    _target: ClassAccessorDecoratorTarget<This, T>,
    _context: ClassAccessorDecoratorContext<This, T>,
  ): ClassAccessorDecoratorResult<This, T> => {
    return {
      get(): T {
        return app.get<T>(key);
      },
      set(_val: T) {
        // Injection is read-only
      },
    };
  };
}

/**
 * Method decorator on @service classes.
 * Return value is registered as a provider on app.start().
 *
 * ```ts
 * @service
 * class Boot {
 *   @factory(ChatServiceNatsClient)
 *   createChat() {
 *     return new ChatServiceNatsClient(app.get(NatsConnection));
 *   }
 * }
 * ```
 */
export const factory = createDecorator<[key?: unknown]>((method, methodName, key) => {
  app.registerFactory(key, { method: methodName, fn: method });
});
