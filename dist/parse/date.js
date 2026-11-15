import { normalizeText } from './normalize.js';
function partsInTimeZone(date, timeZone) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
    const values = Object.fromEntries(formatter
        .formatToParts(date)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]));
    const hour = Number(values.hour);
    return {
        year: Number(values.year),
        month: Number(values.month),
        day: Number(values.day),
        hour: hour === 24 ? 0 : hour,
        minute: Number(values.minute),
        second: Number(values.second),
    };
}
function offsetAt(date, timeZone) {
    const parts = partsInTimeZone(date, timeZone);
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    return asUtc - Math.trunc(date.getTime() / 1000) * 1000;
}
export function zonedTimeToUtc(year, month, day, hour, minute, timeZone) {
    const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
    let result = new Date(guess.getTime() - offsetAt(guess, timeZone));
    result = new Date(guess.getTime() - offsetAt(result, timeZone));
    return result;
}
function validDateParts(year, month, day, hour, minute) {
    if (![year, month, day, hour, minute].every(Number.isFinite))
        return false;
    if (year < 2000 || year > 2100)
        return false;
    if (month < 1 || month > 12)
        return false;
    if (day < 1 || day > 31)
        return false;
    if (hour < 0 || hour > 23)
        return false;
    if (minute < 0 || minute > 59)
        return false;
    const probe = new Date(Date.UTC(year, month - 1, day));
    return probe.getUTCFullYear() === year
        && probe.getUTCMonth() === month - 1
        && probe.getUTCDate() === day;
}
function integer(value) {
    return value === undefined ? Number.NaN : Number.parseInt(value, 10);
}
/**
 * Parse the relative/absolute Chinese timestamps shown on XHS cards and note pages.
 * Returns null instead of guessing when the text is not a recognizable date.
 */
export function parsePublishedAt(raw, now, timeZone) {
    const text = normalizeText(raw);
    if (!text)
        return null;
    const base = partsInTimeZone(now, timeZone);
    const at = (year, month, day, hour, minute) => {
        if (!validDateParts(year, month, day, hour, minute))
            return null;
        return zonedTimeToUtc(year, month, day, hour, minute, timeZone);
    };
    const todayAt = (hour, minute) => at(base.year, base.month, base.day, hour, minute);
    const shiftDays = (days) => new Date(now.getTime() - days * 86_400_000);
    if (/刚刚/.test(text))
        return now;
    // Meta tags often expose an ISO timestamp; Date.parse preserves its offset.
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
        const parsed = new Date(text);
        if (Number.isFinite(parsed.getTime()))
            return parsed;
    }
    let match = text.match(/(\d+)\s*秒前/);
    if (match)
        return new Date(now.getTime() - integer(match[1]) * 1_000);
    match = text.match(/(\d+)\s*分钟前/);
    if (match)
        return new Date(now.getTime() - integer(match[1]) * 60_000);
    match = text.match(/(\d+)\s*小时前/);
    if (match)
        return new Date(now.getTime() - integer(match[1]) * 3_600_000);
    match = text.match(/(\d+)\s*天前/);
    if (match)
        return shiftDays(integer(match[1]));
    match = text.match(/(今天|昨天|前天)\s*(\d{1,2}):(\d{2})?/);
    if (match) {
        const days = match[1] === '今天' ? 0 : match[1] === '昨天' ? 1 : 2;
        const date = shiftDays(days);
        const parts = partsInTimeZone(date, timeZone);
        const hour = integer(match[2]);
        const minute = match[3] === undefined ? 0 : integer(match[3]);
        return at(parts.year, parts.month, parts.day, hour, minute);
    }
    match = text.match(/(今天|昨天|前天)/);
    if (match) {
        const days = match[1] === '今天' ? 0 : match[1] === '昨天' ? 1 : 2;
        return shiftDays(days);
    }
    match = text.match(/(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?(?:[ T](\d{1,2}):(\d{2}))?/);
    if (match) {
        return at(integer(match[1]), integer(match[2]), integer(match[3]), match[4] === undefined ? 0 : integer(match[4]), match[5] === undefined ? 0 : integer(match[5]));
    }
    match = text.match(/(\d{1,2})\s*[-/.月]\s*(\d{1,2})\s*日?(?:[ T](\d{1,2}):(\d{2}))?/);
    if (match) {
        const month = integer(match[1]);
        const day = integer(match[2]);
        const hour = match[3] === undefined ? 0 : integer(match[3]);
        const minute = match[4] === undefined ? 0 : integer(match[4]);
        let date = at(base.year, month, day, hour, minute);
        if (date && date.getTime() > now.getTime() + 86_400_000) {
            date = at(base.year - 1, month, day, hour, minute);
        }
        return date;
    }
    match = text.match(/(\d{1,2}):(\d{2})/);
    if (match)
        return todayAt(integer(match[1]), integer(match[2]));
    return null;
}
export function isFresh(publishedAt, now, freshnessHours) {
    if (publishedAt === null)
        return false;
    const age = now.getTime() - publishedAt.getTime();
    return age >= -5 * 60_000 && age <= freshnessHours * 3_600_000;
}
export function formatDay(now, timeZone) {
    const parts = partsInTimeZone(now, timeZone);
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}
export function formatDateTime(now, timeZone) {
    const parts = partsInTimeZone(now, timeZone);
    return `${formatDay(now, timeZone)} ${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}:${String(parts.second).padStart(2, '0')}`;
}
//# sourceMappingURL=date.js.map