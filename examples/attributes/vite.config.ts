import { defineConfig } from "vite";

export default defineConfig({
    server: {
        port: 4202, // Different port from docs (5173) and todo-mvc (4201)
        fs: {
            allow: ["../.."], // Allow access to loom root
        },
    },
    esbuild: {
        jsx: "automatic",
        jsxImportSource: "@toyz/loom",
        target: "es2022",
    },
});
