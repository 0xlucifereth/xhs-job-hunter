import type { JobNote } from '../types.js';
export declare function matchesJob(text: string, job: string, aliases?: readonly string[]): boolean;
export declare function matchesRegion(text: string, region: string): boolean;
/** In-run dedupe by note id, canonical URL, and title+author. */
export declare function dedupeNotes(notes: JobNote[]): JobNote[];
//# sourceMappingURL=filters.d.ts.map