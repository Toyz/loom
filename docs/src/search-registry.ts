/**
 * Search Registry — @searchable decorator for doc pages.
 *
 * Uses Loom's createDecorator to register pages at define-time.
 * Applied in lazy.ts alongside @route, @component, @lazy.
 */

import { createDecorator } from "@toyz/loom";

export interface SearchEntry {
  title: string;
  section: string;
  keywords: string[];
  to: string;
  icon: string;
  summary?: string;
}

const entries: SearchEntry[] = [];

export const searchable = createDecorator<[entry: SearchEntry]>(
  (_ctor, entry) => { entries.push(entry); },
  { class: true },
);

export function getSearchEntries(): SearchEntry[] {
  return entries;
}
