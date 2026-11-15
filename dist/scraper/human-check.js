import { XhsError } from '../errors.js';
import { LOGIN_SELECTORS, VERIFICATION_SELECTORS } from './selectors.js';
async function anyVisible(page, selectors) {
    for (const selector of selectors) {
        const count = await page.locator(selector).count().catch(() => 0);
        if (count === 0)
            continue;
        const visible = await page.locator(selector).first().isVisible().catch(() => false);
        if (visible)
            return true;
    }
    return false;
}
/**
 * Detect states the plugin must never automate through: login walls, captchas,
 * sliders, and rate-limit notices. Detection throws; it never clicks.
 */
export async function assertHumanState(page) {
    const url = page.url();
    if (/(?:login|passport|signin|website-login)/i.test(url)) {
        throw new XhsError('LOGIN_REQUIRED', '小红书要求登录。请在专用 Chrome 窗口人工登录后重试；插件不会自动登录。');
    }
    if (await anyVisible(page, LOGIN_SELECTORS)) {
        throw new XhsError('LOGIN_REQUIRED', '检测到登录弹窗或登录墙。请在专用 Chrome 窗口人工登录后重试。');
    }
    if (await anyVisible(page, VERIFICATION_SELECTORS)) {
        throw new XhsError('HUMAN_VERIFICATION_REQUIRED', '检测到验证码、滑块或安全验证。请人工完成后重试；插件不会绕过风控。');
    }
    const body = await page.locator('body').innerText({ timeout: 1_500 }).catch(() => '');
    if (/(访问频繁|异常流量|请求过于频繁)/.test(body)) {
        throw new XhsError('RATE_LIMITED', '小红书提示访问频繁或触发限流。请停止运行，至少等待数小时后再试。');
    }
}
//# sourceMappingURL=human-check.js.map