import type { Page } from 'playwright-core';
import type { ResolvedConfig } from '../config.js';
import type { SearchCard } from '../types.js';
export declare function buildSearchUrl(region: string, job: string): string;
export declare function extractCards(page: Page): Promise<SearchCard[]>;
/**
 * Scroll the search feed and collect cards incrementally. The DOM may recycle
 * cards while scrolling, so each round merges into a map instead of collecting
 * everything at the end.
 */
export declare function collectSearchCards(page: Page, config: ResolvedConfig, maxCandidates: number, signal: AbortSignal): Promise<SearchCard[]>;
//# sourceMappingURL=search.d.ts.map