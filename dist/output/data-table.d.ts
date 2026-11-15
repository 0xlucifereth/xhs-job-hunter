import type { Context } from '@deepseek-ai/cordis';
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { ResolvedConfig } from '../config.js';
import type { JobNote, TableResult } from '../types.js';
/** Pure payload builder, also used by tests. */
export declare function buildTablePayload(config: ResolvedConfig, notes: readonly JobNote[], region: string, job: string, day: string, generatedAt: string): Record<string, unknown>;
export declare function writeToDataTable(ctx: Context, exec: ToolRunContext, config: ResolvedConfig, notes: readonly JobNote[], region: string, job: string, day: string): Promise<TableResult>;
//# sourceMappingURL=data-table.d.ts.map