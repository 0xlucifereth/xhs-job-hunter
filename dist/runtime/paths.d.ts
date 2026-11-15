import type { Context } from '@deepseek-ai/cordis';
import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
/** Resolve the current session workspace, falling back to the host process cwd. */
export declare function workspaceBase(ctx: Context, exec: ToolRunContext): string;
export declare function stateDirectory(base: string): string;
export declare function exportDirectory(base: string, day: string): string;
export declare function ensureDirectory(path: string): Promise<void>;
//# sourceMappingURL=paths.d.ts.map