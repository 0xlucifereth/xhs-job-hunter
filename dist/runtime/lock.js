import { XhsError } from '../errors.js';
import { connectChrome } from '../scraper/connect.js';
/**
 * One process-local run lock, a minimum interval between successful runs, and
 * one reusable CDP connection. The plugin never closes the user's browser.
 */
export function createRuntime(config) {
    let tail = Promise.resolve();
    let lastSuccessfulRunAt = 0;
    let chromePromise;
    async function getChrome() {
        if (!chromePromise) {
            chromePromise = connectChrome(config.cdpUrl).catch((error) => {
                chromePromise = undefined;
                throw error;
            });
        }
        const chrome = await chromePromise;
        if (!chrome.browser.isConnected()) {
            chromePromise = undefined;
            return getChrome();
        }
        return chrome;
    }
    return {
        getChrome,
        runExclusive(operation) {
            const run = tail.then(async () => {
                if (lastSuccessfulRunAt > 0
                    && Date.now() - lastSuccessfulRunAt < config.safety.minIntervalSeconds * 1_000) {
                    const waitSeconds = Math.ceil((config.safety.minIntervalSeconds * 1_000 - (Date.now() - lastSuccessfulRunAt)) / 1_000);
                    throw new XhsError('RATE_LIMITED', `两次采集间隔至少 ${config.safety.minIntervalSeconds} 秒，请 ${waitSeconds} 秒后再试。`);
                }
                const result = await operation();
                lastSuccessfulRunAt = Date.now();
                return result;
            });
            tail = run.then(() => undefined, () => undefined);
            return run;
        },
    };
}
//# sourceMappingURL=lock.js.map