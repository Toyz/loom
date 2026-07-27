/**
 * `@component` queues a tag; `app.start()` is what calls
 * customElements.define. Without this, document.createElement in a test
 * returns an element the browser never upgrades -- so it renders nothing and
 * assertions about its shadow root fail for a reason that has nothing to do
 * with the component.
 *
 * Vitest isolates modules per test file, so this runs once per file against a
 * fresh registry.
 */
import { app } from "@toyz/loom";
import "./src/app";

await app.start();
