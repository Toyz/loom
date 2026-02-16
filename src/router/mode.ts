/**
 * Loom Router — Mode abstraction
 *
 * Separates URL read/write/listen so the same router logic
 * works with both hash and history-based navigation.
 */

export interface RouterMode {
  /** Read the current path */
  read(): string;
  /** Navigate to a path (pushes history) */
  write(path: string): void;
  /** Replace current path (no history entry) */
  replace(path: string): void;
  /** Listen for external navigation (back/forward). Returns cleanup fn. */
  listen(cb: () => void): () => void;
  /** Build an href string for <a> tags */
  href(path: string): string;
}

export class HashMode implements RouterMode {
  read(): string {
    return location.hash.slice(1) || "/";
  }

  write(path: string): void {
    location.hash = path;
  }

  replace(path: string): void {
    const url = new URL(location.href);
    url.hash = path;
    history.replaceState(null, "", url);
  }

  listen(cb: () => void): () => void {
    window.addEventListener("hashchange", cb);
    return () => window.removeEventListener("hashchange", cb);
  }

  href(path: string): string {
    return `#${path}`;
  }
}

export class HistoryMode implements RouterMode {
  read(): string {
    return location.pathname || "/";
  }

  write(path: string): void {
    history.pushState(null, "", path);
    // pushState doesn't fire popstate — we dispatch manually
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  replace(path: string): void {
    history.replaceState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  listen(cb: () => void): () => void {
    window.addEventListener("popstate", cb);
    return () => window.removeEventListener("popstate", cb);
  }

  href(path: string): string {
    return path;
  }
}
