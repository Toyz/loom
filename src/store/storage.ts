/**
 * Loom — Storage adapters
 *
 * StorageAdapter defines the contract for persistent stores.
 * Ships with LocalAdapter (localStorage) and SessionAdapter (sessionStorage).
 */

/**
 * Contract for storage backends used by Reactive's persist option.
 */
export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** @deprecated Use StorageAdapter */
export type StorageMedium = StorageAdapter;

/**
 * Persist options for Reactive / CollectionStore constructors.
 */
export interface PersistOptions {
  key: string;
  storage: StorageAdapter;
}

/**
 * In-memory storage. Useful for testing or transient state.
 */
export class MemoryStorage implements StorageAdapter {
  private data = new Map<string, string>();
  get(key: string) { return this.data.get(key) ?? null; }
  set(key: string, value: string) { this.data.set(key, value); }
  remove(key: string) { this.data.delete(key); }
}

/**
 * localStorage adapter. Silently falls back on errors (SSR, iframe sandbox).
 */
export class LocalAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota exceeded or unavailable */
    }
  }
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      /* unavailable */
    }
  }
}

/**
 * sessionStorage adapter. Silently falls back on errors.
 */
export class SessionAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
  set(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* quota exceeded or unavailable */
    }
  }
  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* unavailable */
    }
  }
}

/** @deprecated Use LocalAdapter */
export const LocalMedium = LocalAdapter;

/** @deprecated Use SessionAdapter */
export const SessionMedium = SessionAdapter;
