import type { ResolvedConfig } from '../config.js';
import type { ScrapeResult } from '../types.js';
import type { Runtime } from '../runtime/lock.js';
export interface ScrapeInput {
    config: ResolvedConfig;
    runtime: Runtime;
    baseDirectory: string;
    region: string;
    job: string;
    maxNotes: number;
    signal: AbortSignal;
}
export declare function scrapeJobs(input: ScrapeInput): Promise<ScrapeResult>;
/** Exported for tests and for future selector debugging. */
export declare function scoreTextForJob(text: string, job: string, aliases?: readonly string[]): boolean;
//# sourceMappingURL=index.d.ts.map