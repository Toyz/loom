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
          <div class="group-header">
            <loom-icon name="book" size={20}></loom-icon>
            <h2>Overview</h2>
          </div>
          <p>
            Unlike <span class="ic">@rpc</span> queries (which auto-fetch), mutations are triggered
            manually via <span class="ic">.call()</span>. Use <span class="ic">@mutate</span> for
            any write operation — creating, updating, or deleting data.
          </p>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20}></loom-icon>
            <h2>Basic Usage</h2>
          </div>
          <code-block lang="ts" code={`import { mutate } from "@toyz/loom-rpc";
import type { RpcMutator } from "@toyz/loom-rpc";

@component("edit-profile")
class EditProfile extends LoomElement {
  @mutate(UserRouter, "updateProfile")
  accessor save!: RpcMutator\<[ProfileUpdate], User\>;

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
      \<form onSubmit={() => this.handleSubmit({ name: "New Name" })}\>
        \<button disabled={this.save.loading}\>
          {this.save.loading ? "Saving..." : "Save"}
        \</button\>
        {this.save.error \&\& (
          \<div class="error"\>{this.save.error.message}\</div\>
        )}
      \</form\>
    );
  }
}`}></code-block>
        </section>

        <section>
          <div class="group-header">
            <loom-icon name="code" size={20}></loom-icon>
            <h2>RpcMutator&lt;Args, Return&gt;</h2>
          </div>
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
          <div class="group-header">
            <loom-icon name="refresh" size={20}></loom-icon>
            <h2>Refetching After Mutation</h2>
          </div>
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
          <div class="group-header">
            <loom-icon name="shield" size={20}></loom-icon>
            <h2>Type Inference</h2>
          </div>
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
accessor toggleRole!: RpcMutator\<[string, "admin" | "member"], User\>;

// ✓ Compiles
this.toggleRole.call("1", "admin");

// ✗ Compile error — wrong argument types
this.toggleRole.call(42, "superadmin");`}></code-block>
        </section>
      </div>
    );
  }
}
