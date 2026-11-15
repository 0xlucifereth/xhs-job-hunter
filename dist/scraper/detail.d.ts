import type { Page } from 'playwright-core';
import type { NoteDetail, SearchCard } from '../types.js';
/** Read the fields we need from one note detail page, with card fallbacks. */
export declare function extractDetail(page: Page, card: SearchCard): Promise<NoteDetail>;
//# sourceMappingURL=detail.d.ts.map