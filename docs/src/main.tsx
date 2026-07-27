/**
 * Loom Docs — Entry Point
 */
import "./styles.css";
import "./icons";       // register icons before any component uses them
import "./components/code-block";  // syntax-highlighted code blocks
import "./components/source-block"; // live source from GitHub raw API
import "./components/doc-header";   // page header with auto-generated TOC
import "./components/doc-nav";
import "./components/doc-rail";      // right-hand punched index
import "./components/spec-card";     // the card in the reader, at the foot of the rail      // prev/next page navigation
import "./components/doc-notification"; // callout/alert banners
import "./components/api-table";
import "./components/doc-select";   // custom select — native ones cannot be styled      // reference tables
import "./components/doc-demo";       // live-demo frame
import "./components/doc-section";     // <doc-section> + <api-entry> page skeleton
import "./components/punch-matrix";     // the punch matrix (signature element)
import "./components/doc-tip";          // @attribute popover on decorator tokens

import { app } from "@toyz/loom";
import { LoomRouter } from "@toyz/loom/router";

// Shell
import "./app";

// Eager pages (instant first paint)
import "./pages/home";
import "./pages/not-found";

// All other pages — code-split via @lazy
import "./pages/lazy";

import { installGlobalHook } from "@toyz/loom/debug";

// Only in development
if (import.meta.env.DEV) {
  installGlobalHook();
}

// Boot
// Navigations animate through document.startViewTransition. The outlet swap
// is one synchronous DOM mutation, which is the shape a view transition wants;
// wiring it on the router rather than at each call site means the back button
// and guard redirects animate too. See styles.css for the keyframes.
const router = new LoomRouter({ mode: "hash", transitions: true });
app.use(router);
app.start();
