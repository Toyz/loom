/**
 * Packages — RPC Overview  /packages/rpc-overview
 *
 * Package intro, install, contract pattern, transport registration.
 */
import { LoomElement } from "@toyz/loom";

export default class PageRpcOverview extends LoomElement {
  update() {
    return (
      <div>
        <h1>@toyz/loom-rpc</h1>
        <p class="subtitle">Type-safe, decorator-driven RPC — server-agnostic, transport-swappable.</p>

        <section>
          <h2>Install</h2>
          <code-block lang="bash" code={`npm install @toyz/loom-rpc`}></code-block>
          <p>
            <span class="ic">@toyz/loom</span> is the only dependency.
          </p>
        </section>

        <section>
          <h2>How It Works</h2>
          <p>
            LoomRPC adds two decorators — <span class="ic">@rpc</span> for queries and{" "}
            <span class="ic">@mutate</span> for mutations. Both are type-safe, auto-accessor decorators
            that talk to the server through a swappable <span class="ic">RpcTransport</span>.
          </p>
          <p>
            You define a <strong>contract class</strong> — a plain TypeScript class with method signatures
            that describe your server API. The class is never instantiated; it exists purely for
            TypeScript to extract parameter and return types. Nothing ships to the client except
            the router name string.
          </p>
        </section>

        <section>
          <h2>1. Define a Contract</h2>
          <code-block lang="ts" code={`// contracts/user.ts — shared between client \u0026 server
export class UserRouter {
  getUser(id: string): User { return null!; }
  listUsers(page: number, limit: number): User[] { return null!; }
  updateProfile(data: ProfileUpdate): User { return null!; }
}`}></code-block>
          <p>
            Methods have dummy <span class="ic">return null!</span> bodies — they exist solely for
            type inference. Method names autocomplete, argument types are checked at compile time,
            and return types flow into <span class="ic">ApiState&lt;T&gt;</span> automatically.
          </p>
        </section>

        <section>
          <h2>2. Register a Transport</h2>
          <code-block lang="ts" code={`// main.tsx
import { app } from "@toyz/loom";
import { RpcTransport, HttpTransport } from "@toyz/loom-rpc";

app.use(RpcTransport, new HttpTransport());
// or: new HttpTransport("https://api.example.com/rpc")

app.start();`}></code-block>
          <p>
            Transports are registered via Loom's DI container. Swap to{" "}
            <span class="ic">MockTransport</span> for testing, <span class="ic">WsTransport</span> for
            WebSocket — one line change, zero component modifications.
          </p>
        </section>

        <section>
          <h2>3. Use in Components</h2>
          <code-block lang="tsx" code={`import { rpc, mutate } from "@toyz/loom-rpc";
import { UserRouter } from "../contracts/user";

@component("user-profile")
class UserProfile extends LoomElement {
  @prop({ param: "id" }) accessor userId!: string;

  @rpc(UserRouter, "getUser", {
    fn: el => [el.userId],     // args from reactive state
    staleTime: 60_000,         // SWR: cache 1 minute
  })
  accessor user!: ApiState\u003cUser\u003e;

  @mutate(UserRouter, "updateProfile")
  accessor save!: RpcMutator\u003c[ProfileUpdate], User\u003e;

  update() {
    return this.user.match({
      loading: () => \u003cdiv\u003eLoading...\u003c/div\u003e,
      ok:      (u) => \u003ch1\u003e{u.name}\u003c/h1\u003e,
      err:     (e) => \u003cdiv\u003eError: {e.message}\u003c/div\u003e,
    });
  }
}`}></code-block>
        </section>

        <section>
          <h2>Type Safety</h2>
          <p>Everything is inferred from the contract class:</p>
          <ul>
            <li>Method names are autocompleted and type-checked</li>
            <li>Argument types are inferred from method parameters</li>
            <li>Return types flow into <span class="ic">ApiState&lt;T&gt;</span> automatically</li>
            <li>Pass the wrong types? Compile error.</li>
          </ul>
          <code-block lang="ts" code={`@rpc(UserRouter, "getUser", { fn: el => [el.userId] })
//                 \u2191 autocompleted        \u2191 must be [string]
accessor user!: ApiState\u003cUser\u003e;
//                       \u2191 inferred from UserRouter.getUser return type`}></code-block>
        </section>
      </div>
    );
  }
}
