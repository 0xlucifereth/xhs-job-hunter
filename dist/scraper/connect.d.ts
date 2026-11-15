import type { Browser, BrowserContext, Page } from 'playwright-core';
export interface ConnectedChrome {
    browser: Browser;
    context: BrowserContext;
    cdpUrl: string;
}
/**
 * Attach to an already-running Chrome. The plugin never launches a browser and
 * never closes the user's browser; it only closes pages it creates.
 */
export declare function connectChrome(cdpUrl: string): Promise<ConnectedChrome>;
export declare function closePage(page: Page | undefined): Promise<void>;
//# sourceMappingURL=connect.d.ts.map