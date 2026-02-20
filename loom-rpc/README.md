# @toyz/loom-rpc

Type-safe, decorator-driven RPC for [Loom](https://github.com/Toyz/loom). Server-agnostic, transport-swappable.

```
npm install @toyz/loom-rpc
```

**One dependency:** `@toyz/loom`. That's it.

---

## Quick Start

### 1. Define a Contract

```ts
// contracts/user.ts — shared between client and server
export class UserRouter {
  getUser(id: string): User {
    return null!;
  }
  listUsers(page: number, limit: number): User[] {
    return null!;
  }
  updateProfile(data: ProfileUpdate): User {
    return null!;
  }
}
```

The class is the type contract. Methods have dummy bodies — they exist for TypeScript to extract parameter and return types. Nothing runs. Nothing ships to the client.

### 2. Register a Transport

```ts
// main.tsx
import { app } from "@toyz/loom";
import { RpcTransport, HttpTransport } from "@toyz/loom-rpc";

app.use(RpcTransport, new HttpTransport());
// or: new HttpTransport("https://api.example.com/rpc")

app.start();
```

### 3. Query with `@rpc`

```ts
import { rpc } from "@toyz/loom-rpc";
import { UserRouter } from "../contracts/user";

@component("user-profile")
class UserProfile extends LoomElement {
  @prop({ param: "id" }) accessor userId!: string;

  @rpc(UserRouter, "getUser", {
    fn: el => [el.userId],   // args from element state — re-fetches on change
    staleTime: 60_000,       // SWR: cache for 1 minute
  })
  accessor user!: ApiState<User>;

  update() {
    return this.user.match({
      loading: () => <div>Loading...</div>,
      ok: (user) => <h1>{user.name}</h1>,
      err: (e) => <div>Error: {e.message}</div>,
    });
  }
}
```

### 4. Mutate with `@mutate`

```ts
import { mutate } from "@toyz/loom-rpc";

@component("edit-profile")
class EditProfile extends LoomElement {
  @mutate(UserRouter, "updateProfile")
  accessor save!: RpcMutator<[ProfileUpdate], User>;

  async handleSubmit(data: ProfileUpdate) {
    try {
      const user = await this.save.call(data);
      console.log("Saved:", user.name);
    } catch (e) {
      console.error("Failed:", e);
    }
  }

  update() {
    return (
      <form onSubmit={() => this.handleSubmit({ name: "New Name" })}>
        <button disabled={this.save.loading}>
          {this.save.loading ? "Saving..." : "Save"}
        </button>
      </form>
    );
  }
}
```

---

## API

### `@rpc(Router, method, opts?)`

Auto-accessor decorator for queries. Returns `ApiState<T>` with `.match()`, `.unwrap()`, `.refetch()`, `.invalidate()`.

| Option      | Type           | Default | Description                               |
| ----------- | -------------- | ------- | ----------------------------------------- |
| `fn`        | `(el) => Args` | `[]`    | Extract procedure args from element state |
| `staleTime` | `number`       | `0`     | SWR cache duration (ms)                   |
| `eager`     | `boolean`      | `true`  | Fetch on connect                          |
| `retry`     | `number`       | `0`     | Retry count with exponential backoff      |

### `@mutate(Router, method)`

Auto-accessor decorator for mutations. Returns `RpcMutator<Args, Return>`.

| Property         | Type             | Description            |
| ---------------- | ---------------- | ---------------------- |
| `.call(...args)` | `Promise<T>`     | Execute the mutation   |
| `.loading`       | `boolean`        | In-flight state        |
| `.error`         | `Error \| null`  | Last error             |
| `.data`          | `T \| undefined` | Last successful result |
| `.reset()`       | `void`           | Clear state            |

### `RpcTransport`

Abstract class — implement to control how RPC calls reach the server.

```ts
abstract class RpcTransport {
  abstract call<T>(router: string, method: string, args: any[]): Promise<T>;
}
```

### `HttpTransport`

Default transport — `POST /rpc/{Router}/{Method}` with JSON body.

```ts
new HttpTransport(baseUrl?: string, headers?: Record<string, string>)
```

### `RpcError`

Structured error with `.status`, `.router`, `.method`, `.code`.

---

## Wire Protocol

```
POST /rpc/{RouterName}/{MethodName}
Content-Type: application/json

Request:  { "args": [arg1, arg2, ...] }
Response: { "data": <return value> }
Error:    { "error": { "message": "...", "code": "..." } }
```

**Any server that follows this convention works.** Go, Rust, Python, Express, Hono, Cloudflare Workers — anything that accepts HTTP POST and returns JSON.

---

## Custom Transports

Swap HTTP for WebSocket, gRPC-Web, or anything else:

```ts
class WsTransport extends RpcTransport {
  constructor(private ws: WebSocket) {
    super();
  }

  async call<T>(router: string, method: string, args: any[]): Promise<T> {
    // Your WebSocket RPC logic here
  }
}

app.use(RpcTransport, new WsTransport(ws));
```

One DI swap. Every `@rpc` and `@mutate` in the app uses the new transport. No component changes.

---

## Testing

```ts
import { MockTransport } from "@toyz/loom-rpc/testing";

const transport = new MockTransport();

// Static mocks — pass the class, not a string
transport.mock(UserRouter, "getUser", { id: "1", name: "Alice" });

// Dynamic mocks
transport.mock(UserRouter, "getUser", (id: string) => ({
  id,
  name: `User ${id}`,
}));

// Error mocks
transport.mockError(UserRouter, "deleteUser", new Error("Forbidden"));

// Delay simulation
transport.delay(UserRouter, "getUser", 500);

// Register and go
app.use(RpcTransport, transport);

// Assertions
transport.assertCalled(UserRouter, "getUser", ["1"]);
transport.assertNotCalled(UserRouter, "deleteUser");
console.log(transport.history); // [{ router, method, args }]
```

---

## Type Safety

Everything is inferred from the contract class:

```ts
@rpc(UserRouter, "getUser", { fn: el => [el.userId] })
//                 ↑ autocompleted        ↑ must be [string]
accessor user!: ApiState<User>;
//                       ↑ inferred from UserRouter.getUser return type
```

- Method names are autocompleted and type-checked
- Argument types are inferred from the contract method parameters
- Return types flow into `ApiState<T>` automatically
- Pass the wrong types? Compile error.

---

## License

MIT
