import { normalizeText } from './normalize.js';
export function matchesJob(text, job, aliases = []) {
    const haystack = normalizeText(text).toLowerCase();
    if (!haystack)
        return false;
    const needles = [job, ...aliases]
        .map((value) => normalizeText(value).toLowerCase())
        .filter((value) => value.length > 0);
    return needles.some((needle) => haystack.includes(needle));
}
export function matchesRegion(text, region) {
    const haystack = normalizeText(text).toLowerCase();
    const needle = normalizeText(region).toLowerCase();
    return needle.length > 0 && haystack.includes(needle);
}
/** In-run dedupe by note id, canonical URL, and title+author. */
export function dedupeNotes(notes) {
    const byId = new Map();
    const byUrl = new Set();
    const byTitle = new Set();
    for (const note of notes) {
        const titleKey = `${normalizeText(note.title).toLowerCase()}|${normalizeText(note.author).toLowerCase()}`;
        if (byId.has(note.id) || byUrl.has(note.url) || byTitle.has(titleKey))
            continue;
        byId.set(note.id, note);
        byUrl.add(note.url);
        byTitle.add(titleKey);
    }
    return [...byId.values()];
}
//# sourceMappingURL=filters.js.map