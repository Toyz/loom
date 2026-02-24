/**
 * Loom Docs — Entry Point
 */
import "./styles.css";
import "./icons";       // register icons before any component uses them
import "./components/code-block";  // syntax-highlighted code blocks
import "./components/source-block"; // live source from GitHub raw API

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
const router = new LoomRouter({ mode: "hash" });
app.use(router);
app.start();
router.start();
