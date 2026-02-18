import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    server: {
        port: 4201, // Different port from docs
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
