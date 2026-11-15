import { resolveConfig } from './config.js';
import { createRuntime } from './runtime/lock.js';
import { registerXhsJobScrape } from './tool.js';
export const name = 'xhs-job-hunter';
export const inject = ['tools'];
/**
 * Host-only plugin entry. The tool registry owns the registration lifecycle;
 * the scanner itself never launches or closes the user's browser.
 */
export function apply(ctx, rawConfig) {
    const config = resolveConfig(rawConfig);
    const runtime = createRuntime(config);
    ctx.effect(() => registerXhsJobScrape(ctx, config, runtime));
}
//# sourceMappingURL=index.js.map