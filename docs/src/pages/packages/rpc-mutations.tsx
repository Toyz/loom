/**
 * Packages — @mutate Mutations  /packages/rpc-mutations
 *
 * @mutate decorator, RpcMutator, .call(), loading/error tracking.
 */
import { LoomElement } from "@toyz/loom";

export default class PageRpcMutations extends LoomElement {
  update() {
    return (
      <div>
        <h1>@mutate — Mutations</h1>
        <p class="subtitle">Manual, type-safe server writes with loading and error tracking.</p>

        <section>
          <h2>Overview</h2>
          <p>
            Unlike <span class="ic">@rpc</span> queries (which auto-fetch), mutations are triggered
            manually via <span class="ic">.call()</span>. Use <span class="ic">@mutate</span> for
            any write operation — creating, updating, or deleting data.
          </p>
        </section>

        <section>
          <h2>Basic Usage</h2>
          <code-block lang="ts" code={`import { mutate } from "@toyz/loom-rpc";
import type { RpcMutator } from "@toyz/loom-rpc";

@component("edit-profile")
class EditProfile extends LoomElement {
  @mutate(UserRouter, "updateProfile")
  accessor save!: RpcMutator\u003c[ProfileUpdate], User\u003e;

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
      \u003cform onSubmit={() => this.handleSubmit({ name: "New Name" })}\u003e
        \u003cbutton disabled={this.save.loading}\u003e
          {this.save.loading ? "Saving..." : "Save"}
        \u003c/button\u003e
        {this.save.error \u0026\u0026 (
          \u003cdiv class="error"\u003e{this.save.error.message}\u003c/div\u003e
        )}
      \u003c/form\u003e
    );
  }
}`}></code-block>
        </section>

        <section>
          <h2>RpcMutator&lt;Args, Return&gt;</h2>
          <p>
            The accessor type for <span class="ic">@mutate</span>. Tracks in-flight state
            and stores the result of the last call.
          </p>
          <table class="api-table">
            <thead><tr><th>Property / Method</th><th>Type</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code>.call(...args)</code></td><td>Promise&lt;T&gt;</td><td>Execute the mutation. Returns the result or throws on error.</td></tr>
              <tr><td><code>.loading</code></td><td>boolean</td><td>True while the mutation is in flight.</td></tr>
              <tr><td><code>.error</code></td><td>Error | null</td><td>Error from the last attempt, or null.</td></tr>
              <tr><td><code>.data</code></td><td>T | undefined</td><td>Data from the last successful call.</td></tr>
              <tr><td><code>.reset()</code></td><td>void</td><td>Clear all state (data, error, loading).</td></tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2>Refetching After Mutation</h2>
          <p>
            After a successful mutation, you'll often want to refresh related queries.
            Call <span class="ic">.refetch()</span> or <span class="ic">.invalidate()</span> on
            the query accessor:
          </p>
          <code-block lang="ts" code={`async handleToggleRole(user: User) {
  const newRole = user.role === "admin" ? "member" : "admin";
  try {
    await this.toggleRole.call(user.id, newRole);
    // Refresh the user list after the mutation
    this.users.refetch();
  } catch (e) {
    console.error("Failed:", e);
  }
}`}></code-block>
        </section>

        <section>
          <h2>Type Inference</h2>
          <p>
            The <span class="ic">Args</span> and <span class="ic">Return</span> types are inferred
            from the contract class. You only need to specify the <span class="ic">RpcMutator</span>{" "}
            type annotation on the accessor for TypeScript to enforce correct usage:
          </p>
          <code-block lang="ts" code={`class UserRouter {
  updateRole(id: string, role: "admin" | "member"): User {
    return null!;
  }
}

// Args = [string, "admin" | "member"], Return = User
@mutate(UserRouter, "updateRole")
accessor toggleRole!: RpcMutator\u003c[string, "admin" | "member"], User\u003e;

// ✓ Compiles
this.toggleRole.call("1", "admin");

// ✗ Compile error — wrong argument types
this.toggleRole.call(42, "superadmin");`}></code-block>
        </section>
      </div>
    );
  }
}
