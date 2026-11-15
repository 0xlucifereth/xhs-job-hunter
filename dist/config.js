const DEFAULTS = {
    cdpUrl: 'http://127.0.0.1:9222',
    timezone: 'Asia/Shanghai',
    freshnessHours: 24,
    hardMaxNotes: 50,
    toolTimeoutMs: 300_000,
    maxScrolls: 30,
    summaryMaxChars: 240,
    jobAliases: [],
    detailDelayMinMs: 1_200,
    detailDelayMaxMs: 2_600,
    scrollDelayMinMs: 1_000,
    scrollDelayMaxMs: 1_800,
    dataTable: {
        enabled: true,
        workbookId: 'xhs-jobs',
        workbookName: '小红书招聘笔记',
        sheetName: '招聘笔记',
    },
    export: {
        enabled: true,
        formats: ['xlsx', 'csv'],
    },
    safety: {
        minIntervalSeconds: 60,
        dedupeEnabled: true,
        seenWindowDays: 30,
    },
};
function objectOf(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : {};
}
function stringOf(value, fallback, name) {
    if (value === undefined || value === null)
        return fallback;
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error(`${name} 必须是非空字符串`);
    }
    return value.trim();
}
function booleanOf(value, fallback, name) {
    if (value === undefined || value === null)
        return fallback;
    if (typeof value !== 'boolean')
        throw new Error(`${name} 必须是布尔值`);
    return value;
}
function numberOf(value, fallback, name, min, max, integer = false) {
    if (value === undefined || value === null)
        return fallback;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`${name} 必须是数字`);
    }
    if (integer && !Number.isInteger(value))
        throw new Error(`${name} 必须是整数`);
    if (value < min || value > max)
        throw new Error(`${name} 必须在 ${min} 到 ${max} 之间`);
    return value;
}
function stringsOf(value, fallback, name) {
    if (value === undefined || value === null)
        return [...fallback];
    if (!Array.isArray(value))
        throw new Error(`${name} 必须是数组`);
    return value.map((entry, index) => {
        if (typeof entry !== 'string')
            throw new Error(`${name}[${index}] 必须是字符串`);
        return entry.trim();
    });
}
export function resolveConfig(raw) {
    const input = objectOf(raw);
    const data = objectOf(input.dataTable);
    const exportConfig = objectOf(input.export);
    const safety = objectOf(input.safety);
    const config = {
        cdpUrl: stringOf(input.cdpUrl, DEFAULTS.cdpUrl, 'cdpUrl'),
        timezone: stringOf(input.timezone, DEFAULTS.timezone, 'timezone'),
        freshnessHours: numberOf(input.freshnessHours, DEFAULTS.freshnessHours, 'freshnessHours', 1, 168),
        hardMaxNotes: numberOf(input.hardMaxNotes, DEFAULTS.hardMaxNotes, 'hardMaxNotes', 1, 50, true),
        toolTimeoutMs: numberOf(input.toolTimeoutMs, DEFAULTS.toolTimeoutMs, 'toolTimeoutMs', 30_000, 900_000, true),
        maxScrolls: numberOf(input.maxScrolls, DEFAULTS.maxScrolls, 'maxScrolls', 3, 100, true),
        summaryMaxChars: numberOf(input.summaryMaxChars, DEFAULTS.summaryMaxChars, 'summaryMaxChars', 80, 1_000, true),
        jobAliases: stringsOf(input.jobAliases, DEFAULTS.jobAliases, 'jobAliases')
            .filter((value) => value.length > 0),
        detailDelayMinMs: numberOf(input.detailDelayMinMs, DEFAULTS.detailDelayMinMs, 'detailDelayMinMs', 0, 30_000, true),
        detailDelayMaxMs: numberOf(input.detailDelayMaxMs, DEFAULTS.detailDelayMaxMs, 'detailDelayMaxMs', 0, 30_000, true),
        scrollDelayMinMs: numberOf(input.scrollDelayMinMs, DEFAULTS.scrollDelayMinMs, 'scrollDelayMinMs', 0, 30_000, true),
        scrollDelayMaxMs: numberOf(input.scrollDelayMaxMs, DEFAULTS.scrollDelayMaxMs, 'scrollDelayMaxMs', 0, 30_000, true),
        dataTable: {
            enabled: booleanOf(data.enabled, DEFAULTS.dataTable.enabled, 'dataTable.enabled'),
            workbookId: stringOf(data.workbookId, DEFAULTS.dataTable.workbookId, 'dataTable.workbookId'),
            workbookName: stringOf(data.workbookName, DEFAULTS.dataTable.workbookName, 'dataTable.workbookName'),
            sheetName: stringOf(data.sheetName, DEFAULTS.dataTable.sheetName, 'dataTable.sheetName'),
        },
        export: {
            enabled: booleanOf(exportConfig.enabled, DEFAULTS.export.enabled, 'export.enabled'),
            formats: [...new Set(stringsOf(exportConfig.formats, DEFAULTS.export.formats, 'export.formats')
                    .map((format) => format.toLowerCase())
                    .filter((format) => format.length > 0))],
        },
        safety: {
            minIntervalSeconds: numberOf(safety.minIntervalSeconds, DEFAULTS.safety.minIntervalSeconds, 'safety.minIntervalSeconds', 0, 86_400),
            dedupeEnabled: booleanOf(safety.dedupeEnabled, DEFAULTS.safety.dedupeEnabled, 'safety.dedupeEnabled'),
            seenWindowDays: numberOf(safety.seenWindowDays, DEFAULTS.safety.seenWindowDays, 'safety.seenWindowDays', 0, 365, true),
        },
    };
    if (config.detailDelayMinMs > config.detailDelayMaxMs) {
        throw new Error('detailDelayMinMs 不能大于 detailDelayMaxMs');
    }
    if (config.scrollDelayMinMs > config.scrollDelayMaxMs) {
        throw new Error('scrollDelayMinMs 不能大于 scrollDelayMaxMs');
    }
    for (const format of config.export.formats) {
        if (format !== 'xlsx' && format !== 'csv') {
            throw new Error(`export.formats 只支持 xlsx 和 csv，收到：${format}`);
        }
    }
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: config.timezone }).format();
    }
    catch {
        throw new Error(`无效的 timezone：${config.timezone}`);
    }
    return config;
}
//# sourceMappingURL=config.js.map