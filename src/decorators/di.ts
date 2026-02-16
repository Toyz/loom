import { INJECT_PARAMS } from "./symbols";
import { app } from "../app";

/**
 * Auto-instantiated singleton. Registered on app.start().
 * Constructor @inject params are resolved automatically.
 *
 * ```ts
 * @service
 * class BookmarkStore extends CollectionStore<Bookmark> { ... }
 * ```
 */
export function service(ctor: any): void {
  app.registerService(ctor);
}

/**
 * Dual-mode dependency injection.
 *
 * Property:     @inject(Foo) foo!: Foo;
 * Constructor:  constructor(@inject(Config) config: Config)
 * Factory arg:  createChat(@inject(NatsConn) nc: NatsConn)
 *
 * T is optional — use for explicit typing if desired.
 */
export function inject<T = any>(key: any) {
  return (target: any, propOrMethod: string | undefined, index?: number) => {
    if (index !== undefined) {
      // Parameter decorator → store metadata for resolution on start()
      const proto = propOrMethod ? target : target.prototype;
      const method = propOrMethod ?? "constructor";
      if (!proto[INJECT_PARAMS]) proto[INJECT_PARAMS] = [];
      proto[INJECT_PARAMS].push({ method, index, key });
    } else {
      // Property decorator → lazy getter
      Object.defineProperty(target, propOrMethod!, {
        get() {
          return app.get<T>(key);
        },
        configurable: true,
      });
    }
  };
}

/**
 * Method decorator on @service classes.
 * Return value is registered as a provider on app.start().
 * Supports @inject on parameters. Async methods are awaited.
 *
 * ```ts
 * @service
 * class Boot {
 *   @factory(ChatServiceNatsClient)
 *   createChat(@inject(NatsConnection) nc: NatsConnection) {
 *     return new ChatServiceNatsClient(nc);
 *   }
 * }
 * ```
 */
export function factory(key?: any) {
  return (target: any, method: string) => {
    app.registerFactory(key, target, method);
  };
}
