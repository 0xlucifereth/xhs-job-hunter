import type { Context } from '@deepseek-ai/cordis';
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { ResolvedConfig } from '../config.js';
import type { JobNote, TableResult } from '../types.js';
export interface PublishInput {
    ctx: Context;
    exec: ToolRunContext;
    config: ResolvedConfig;
    baseDirectory: string;
    notes: readonly JobNote[];
    region: string;
    job: string;
}
/**
 * Prefer the interactive dsh-data-table workbook. If it is missing or rejects
 * the write, keep the scrape useful by writing CSV/XLSX into the workspace.
 */
export declare function publish(input: PublishInput): Promise<TableResult>;
//# sourceMappingURL=publish.d.ts.map