import type { ResolvedConfig } from '../config.js';
import { type ConnectedChrome } from '../scraper/connect.js';
export interface Runtime {
    getChrome(): Promise<ConnectedChrome>;
    runExclusive<T>(operation: () => Promise<T>): Promise<T>;
}
/**
 * One process-local run lock, a minimum interval between successful runs, and
 * one reusable CDP connection. The plugin never closes the user's browser.
 */
export declare function createRuntime(config: ResolvedConfig): Runtime;
//# sourceMappingURL=lock.d.ts.map