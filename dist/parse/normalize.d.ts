export declare function normalizeText(input: unknown): string;
export declare function truncateText(input: string, maxChars: number): string;
export declare function noteIdFromUrl(input: string): string | null;
/**
 * Keep the note id and the access token XHS puts on search links.
 * Dropping `xsec_token` can turn a valid note link into an access-denied page.
 */
export declare function canonicalNoteUrl(raw: string, baseUrl?: string): string;
export declare function escapeMarkdownCell(input: string): string;
export declare function randomBetween(min: number, max: number): number;
//# sourceMappingURL=normalize.d.ts.map