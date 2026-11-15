export declare function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date;
/**
 * Parse the relative/absolute Chinese timestamps shown on XHS cards and note pages.
 * Returns null instead of guessing when the text is not a recognizable date.
 */
export declare function parsePublishedAt(raw: string | null | undefined, now: Date, timeZone: string): Date | null;
export declare function isFresh(publishedAt: Date | null, now: Date, freshnessHours: number): boolean;
export declare function formatDay(now: Date, timeZone: string): string;
export declare function formatDateTime(now: Date, timeZone: string): string;
//# sourceMappingURL=date.d.ts.map