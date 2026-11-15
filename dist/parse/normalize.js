export function normalizeText(input) {
    return String(input ?? '')
        .normalize('NFKC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
export function truncateText(input, maxChars) {
    const text = normalizeText(input);
    if (text.length <= maxChars)
        return text;
    return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}
export function noteIdFromUrl(input) {
    const match = input.match(/(?:explore|discovery\/item)\/([0-9a-zA-Z]{16,40})/);
    return match?.[1] ?? null;
}
/**
 * Keep the note id and the access token XHS puts on search links.
 * Dropping `xsec_token` can turn a valid note link into an access-denied page.
 */
export function canonicalNoteUrl(raw, baseUrl = 'https://www.xiaohongshu.com') {
    let parsed;
    try {
        parsed = new URL(raw, baseUrl);
    }
    catch {
        return raw;
    }
    const id = noteIdFromUrl(parsed.pathname);
    if (!id)
        return parsed.toString();
    const canonical = new URL(`/explore/${id}`, 'https://www.xiaohongshu.com');
    for (const key of ['xsec_token', 'xsec_source']) {
        const value = parsed.searchParams.get(key);
        if (value)
            canonical.searchParams.set(key, value);
    }
    return canonical.toString();
}
export function escapeMarkdownCell(input) {
    return input
        .replace(/\\/g, '\\\\')
        .replace(/\|/g, '\\|')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
        .replace(/\r?\n/g, ' ');
}
export function randomBetween(min, max) {
    if (max <= min)
        return Math.max(0, min);
    return Math.round(min + Math.random() * (max - min));
}
//# sourceMappingURL=normalize.js.map