import { throwIfAborted, toErrorMessage, XhsError } from '../errors.js';
import { isSeen, loadSeen } from '../runtime/state.js';
import { parsePublishedAt, isFresh } from '../parse/date.js';
import { matchesJob, matchesRegion, dedupeNotes } from '../parse/filters.js';
import { normalizeText, randomBetween, truncateText } from '../parse/normalize.js';
import { closePage } from './connect.js';
import { extractDetail } from './detail.js';
import { assertHumanState } from './human-check.js';
import { buildSearchUrl, collectSearchCards } from './search.js';
function isStopError(error) {
    return error instanceof XhsError
        && (error.code === 'LOGIN_REQUIRED'
            || error.code === 'HUMAN_VERIFICATION_REQUIRED'
            || error.code === 'RATE_LIMITED'
            || error.code === 'ABORTED'
            || error.code === 'CDP_UNAVAILABLE');
}
function sortNotes(notes) {
    return [...notes].sort((left, right) => {
        const leftTime = left.publishedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(left.publishedAt);
        const rightTime = right.publishedAt === null ? Number.NEGATIVE_INFINITY : Date.parse(right.publishedAt);
        return rightTime - leftTime;
    });
}
export async function scrapeJobs(input) {
    const { config, runtime, baseDirectory, region, job, maxNotes, signal } = input;
    const startedAt = new Date().toISOString();
    const now = new Date();
    const query = `${region} ${job} 招聘`;
    const warnings = [];
    const skipped = {
        seen: 0,
        duplicate: 0,
        stale: 0,
        irrelevant: 0,
        unparsedDate: 0,
    };
    const seen = config.safety.dedupeEnabled
        ? await loadSeen(baseDirectory)
        : { version: 1, items: {} };
    const chrome = await runtime.getChrome();
    const searchPage = await chrome.context.newPage();
    let cards = [];
    try {
        searchPage.setDefaultTimeout(15_000);
        await searchPage.goto(buildSearchUrl(region, job), {
            waitUntil: 'domcontentloaded',
            timeout: 25_000,
        });
        await assertHumanState(searchPage);
        cards = await collectSearchCards(searchPage, config, Math.min(Math.max(maxNotes * 3, 15), 150), signal);
    }
    finally {
        await closePage(searchPage);
    }
    if (cards.length === 0) {
        warnings.push('搜索结果为空。可能是关键词太窄、页面结构变化，或当前账号被限流。');
    }
    const notes = [];
    const detailPage = await chrome.context.newPage();
    let regionMismatch = 0;
    try {
        detailPage.setDefaultTimeout(15_000);
        for (const card of cards) {
            throwIfAborted(signal);
            if (notes.length >= maxNotes)
                break;
            if (isSeen(seen, card.id, now, config)) {
                skipped.seen += 1;
                continue;
            }
            let detail;
            try {
                await detailPage.goto(card.url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 25_000,
                });
                await assertHumanState(detailPage);
                detail = await extractDetail(detailPage, card);
            }
            catch (error) {
                if (isStopError(error))
                    throw error;
                warnings.push(`详情页读取失败（${card.title}）：${toErrorMessage(error)}`);
                continue;
            }
            const published = parsePublishedAt(detail.publishedText, now, config.timezone);
            if (published !== null && !isFresh(published, now, config.freshnessHours)) {
                skipped.stale += 1;
                continue;
            }
            if (published === null) {
                skipped.unparsedDate += 1;
            }
            const text = `${card.title} ${detail.title} ${detail.summary} ${detail.author}`;
            if (!matchesJob(text, job, config.jobAliases)) {
                skipped.irrelevant += 1;
                continue;
            }
            if (!matchesRegion(text, region))
                regionMismatch += 1;
            notes.push({
                id: card.id,
                title: detail.title || card.title,
                url: card.url,
                publishedAt: published?.toISOString() ?? null,
                publishedText: detail.publishedText || card.publishedText,
                summary: truncateText(detail.summary || card.summary, config.summaryMaxChars),
                author: detail.author || card.author,
                region,
                job,
                query,
                collectedAt: new Date().toISOString(),
            });
            if (notes.length >= maxNotes)
                break;
            await detailPage.waitForTimeout(randomBetween(config.detailDelayMinMs, config.detailDelayMaxMs));
        }
    }
    finally {
        await closePage(detailPage);
    }
    if (skipped.unparsedDate > 0) {
        warnings.push(`${skipped.unparsedDate} 条笔记的发布时间无法解析，已保留并在表格中留空。`);
    }
    if (regionMismatch > 0) {
        warnings.push(`${regionMismatch} 条结果的正文没有出现“${region}”，可能是搜索联想结果，建议人工抽查。`);
    }
    const finalNotes = sortNotes(dedupeNotes(notes)).slice(0, maxNotes);
    skipped.duplicate += Math.max(0, notes.length - finalNotes.length);
    const finishedAt = new Date().toISOString();
    return {
        notes: finalNotes,
        meta: {
            region,
            job,
            query,
            requested: maxNotes,
            returned: finalNotes.length,
            skipped,
            table: { mode: 'none' },
            warnings: [...new Set(warnings)].slice(0, 12),
            startedAt,
            finishedAt,
        },
    };
}
/** Exported for tests and for future selector debugging. */
export function scoreTextForJob(text, job, aliases = []) {
    return matchesJob(normalizeText(text), job, aliases);
}
//# sourceMappingURL=index.js.map