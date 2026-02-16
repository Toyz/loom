/**
 * Loom Docs — Entry Point
 */
import "./styles.css";
import "./icons";       // register icons before any component uses them
import "./components/code-block";  // syntax-highlighted code blocks

import { app } from "@toyz/loom";
import { LoomRouter } from "@toyz/loom/router";

// Shell
import "./app";

// Pages — Guides
import "./pages/home";
import "./pages/getting-started";
import "./pages/first-app";

// Pages — Core
import "./pages/element";
import "./pages/reactive";
import "./pages/events";
import "./pages/jsx";
import "./pages/storage";

// Pages — Features
import "./pages/decorators";
import "./pages/router";
import "./pages/virtual-list";
import "./pages/di";

// 404
import "./pages/not-found";

// Boot
const router = new LoomRouter({ mode: "hash" });
app.use(router);
app.start();
router.start();
