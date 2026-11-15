import type { ResolvedConfig } from '../config.js';
import type { JobNote } from '../types.js';
interface SeenEntry {
    url: string;
    firstSeenAt: string;
    lastSeenAt: string;
}
interface SeenFile {
    version: 1;
    items: Record<string, SeenEntry>;
}
export declare function loadSeen(base: string): Promise<SeenFile>;
export declare function isSeen(seen: SeenFile, id: string, now: Date, config: ResolvedConfig): boolean;
export declare function markSeen(base: string, config: ResolvedConfig, notes: readonly JobNote[]): Promise<void>;
export {};
//# sourceMappingURL=state.d.ts.map