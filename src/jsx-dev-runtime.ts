/**
 * Loom — JSX Dev Runtime
 *
 * In development, React-style JSX transform imports from jsx-dev-runtime.
 * We just re-export the production runtime since we don't need dev-specific features.
 */
export { jsx as jsxDEV, Fragment } from "./jsx-runtime";
