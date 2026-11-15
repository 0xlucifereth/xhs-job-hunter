import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
/** Resolve the current session workspace, falling back to the host process cwd. */
export function workspaceBase(ctx, exec) {
    const service = ctx.get?.('workingDirectory');
    const session = exec.agent?.session;
    if (service?.get && session) {
        try {
            return service.get(session);
        }
        catch {
            // Fall through to the process cwd.
        }
    }
    return process.cwd();
}
export function stateDirectory(base) {
    return join(base, '.xhs-job-hunter');
}
export function exportDirectory(base, day) {
    return join(base, 'xhs-job-hunter', day);
}
export async function ensureDirectory(path) {
    await mkdir(path, { recursive: true });
}
//# sourceMappingURL=paths.js.map