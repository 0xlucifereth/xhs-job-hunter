import type { Page } from 'playwright-core';
/**
 * Detect states the plugin must never automate through: login walls, captchas,
 * sliders, and rate-limit notices. Detection throws; it never clicks.
 */
export declare function assertHumanState(page: Page): Promise<void>;
//# sourceMappingURL=human-check.d.ts.map