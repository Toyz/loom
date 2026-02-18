import { app } from "@toyz/loom";
import { LoomRouter } from "@toyz/loom";
import "./app";
import "./store";
import "./styles/main.css";

// Configure Router
const router = new LoomRouter({ mode: "hash" });

// Boot
app.use(router).start();
router.start();

console.log("Loom TodoMVC Started");
