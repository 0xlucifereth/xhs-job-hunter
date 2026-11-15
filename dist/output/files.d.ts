import type { ResolvedConfig } from '../config.js';
import type { JobNote } from '../types.js';
export interface WrittenFiles {
    xlsxPath?: string;
    csvPath?: string;
}
export declare function writeFiles(baseDirectory: string, day: string, notes: readonly JobNote[], config: ResolvedConfig): Promise<WrittenFiles>;
//# sourceMappingURL=files.d.ts.map