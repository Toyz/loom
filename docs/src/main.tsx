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

// Pages — Element
import "./pages/element/overview";
import "./pages/element/lifecycle";
import "./pages/element/timing";
import "./pages/element/css";
import "./pages/element/queries";
import "./pages/element/jsx";
import "./pages/element/virtual-list";
import "./pages/element/icon";

// Pages — Store
import "./pages/store/reactive";
import "./pages/store/store-decorator";
import "./pages/store/storage";
import "./pages/store/patterns";

// Pages — DI & Services
import "./pages/di/overview";

// Pages — Router
import "./pages/router/overview";
import "./pages/router/routes";
import "./pages/router/guards";
import "./pages/router/groups";
import "./pages/router/navigation";
import "./pages/router/route-lifecycle";

// Pages — Decorators
import "./pages/decorators/overview";
import "./pages/decorators/events";
import "./pages/decorators/transform";

// 404
import "./pages/not-found";

// Boot
const router = new LoomRouter({ mode: "hash" });
app.use(router);
app.start();
router.start();
