import { normalizeText, truncateText } from '../parse/normalize.js';
import { DETAIL_AUTHOR_SELECTORS, DETAIL_DESC_SELECTORS, DETAIL_TIME_SELECTORS, DETAIL_TITLE_SELECTORS, } from './selectors.js';
async function firstText(scope, selectors) {
    for (const selector of selectors) {
        const locator = scope.locator(selector).first();
        const count = await locator.count().catch(() => 0);
        if (count === 0)
            continue;
        const text = await locator.textContent({ timeout: 1_000 }).catch(() => null);
        const normalized = normalizeText(text);
        if (normalized)
            return normalized;
    }
    return '';
}
async function metaContent(page, selector) {
    const locator = page.locator(selector).first();
    const count = await locator.count().catch(() => 0);
    if (count === 0)
        return '';
    return normalizeText(await locator.getAttribute('content', { timeout: 800 }).catch(() => null));
}
/** Read the fields we need from one note detail page, with card fallbacks. */
export async function extractDetail(page, card) {
    const title = (await firstText(page, DETAIL_TITLE_SELECTORS))
        || (await metaContent(page, 'meta[property="og:title"]'))
        || card.title
        || normalizeText(await page.title().catch(() => ''));
    const description = (await firstText(page, DETAIL_DESC_SELECTORS))
        || (await metaContent(page, 'meta[name="description"]'))
        || card.summary;
    const author = (await firstText(page, DETAIL_AUTHOR_SELECTORS))
        || (await metaContent(page, 'meta[name="author"]'))
        || card.author;
    const publishedText = (await firstText(page, DETAIL_TIME_SELECTORS))
        || (await metaContent(page, 'meta[property="article:published_time"]'))
        || (await metaContent(page, 'meta[name="date"]'))
        || card.publishedText;
    return {
        title: truncateText(title, 160) || '(无标题)',
        author: truncateText(author, 80),
        publishedText: truncateText(publishedText, 80),
        summary: truncateText(description, 600),
    };
}
//# sourceMappingURL=detail.js.map