export interface DataTableConfig {
    enabled: boolean;
    workbookId: string;
    workbookName: string;
    sheetName: string;
}
export interface ExportConfig {
    enabled: boolean;
    formats: string[];
}
export interface SafetyConfig {
    minIntervalSeconds: number;
    dedupeEnabled: boolean;
    seenWindowDays: number;
}
export interface ResolvedConfig {
    cdpUrl: string;
    timezone: string;
    freshnessHours: number;
    hardMaxNotes: number;
    toolTimeoutMs: number;
    maxScrolls: number;
    summaryMaxChars: number;
    jobAliases: string[];
    detailDelayMinMs: number;
    detailDelayMaxMs: number;
    scrollDelayMinMs: number;
    scrollDelayMaxMs: number;
    dataTable: DataTableConfig;
    export: ExportConfig;
    safety: SafetyConfig;
}
export declare function resolveConfig(raw: unknown): ResolvedConfig;
//# sourceMappingURL=config.d.ts.map