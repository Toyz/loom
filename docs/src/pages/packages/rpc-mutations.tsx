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
        <doc-header title="@mutate — Mutations" subtitle="Manual, type-safe server writes with loading and error tracking."></doc-header>

        <section>
          <p>A write is the opposite of a read on every axis that matters: it must not fire on its own, it must not be retried blindly, and it invalidates cached reads that are now wrong.</p>
          <p><span class="ic">@mutate</span> is therefore explicit — nothing happens until you call it — and it tracks its own loading and error state so the button that triggered it can disable itself without a second field.</p>
        </section>

        <doc-section heading="Overview">
          <p>
            Unlike <span class="ic">@rpc</span> queries (which auto-fetch), mutations are triggered
            manually via <span class="ic">.call()</span>. Use <span class="ic">@mutate</span> for
            any write operation — creating, updating, or deleting data.
          </p>
        </doc-section>
        <doc-section heading="Basic Usage">
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
        </doc-section>
        <doc-section heading="RpcMutator&lt;Args, Return&gt;">
          <p>
            The accessor type for <span class="ic">@mutate</span>. Tracks in-flight state
            and stores the result of the last call.
          </p>
          <api-table
            head={["Property / Method", "Type", "Description"]}
            rows={[
              [<code>.call(...args)</code>, "Promise&lt;T&gt;", "Execute the mutation. Returns the result or throws on error."],
              [<code>.loading</code>, "boolean", "True while the mutation is in flight."],
              [<code>.error</code>, "Error | null", "Error from the last attempt, or null."],
              [<code>.data</code>, "T | undefined", "Data from the last successful call."],
              [<code>.reset()</code>, "void", "Clear all state (data, error, loading)."],
            ]}
          ></api-table>
        </doc-section>
        <doc-section heading="Refetching After Mutation">
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
        </doc-section>
        <doc-section heading="Type Inference">
          <p>
            The <span class="ic">Args</span> and <span class="ic">Return</span> types are inferred
            from the contract class. You only need to specify the <span class="ic">RpcMutator</span> type annotation on the accessor for TypeScript to enforce correct usage:
          </p>
          <code-block lang="ts" code={`class UserRouter {
  updateRole(id: string, role: "admin" | "member"): User {
    return null!;
  }
}

// Args = [string, "admin" | "member"], Return = User
@mutate(UserRouter, "updateRole")
accessor toggleRole!: RpcMutator\<[string, "admin" | "member"], User\>;

// Compiles
this.toggleRole.call("1", "admin");

// ✗ Compile error — wrong argument types
this.toggleRole.call(42, "superadmin");`}></code-block>
        </doc-section>
        <doc-nav></doc-nav>
      </div>
    );
  }
}
