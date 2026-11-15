import { createHash, randomUUID } from 'node:crypto';
import { XhsError } from '../errors.js';
import { notesToRows } from './columns.js';
const DATA_TABLE_COLUMNS = [
    { key: 'region', label: '地区', type: 'string' },
    { key: 'job', label: '岗位', type: 'string' },
    { key: 'title', label: '标题', type: 'string' },
    { key: 'url', label: '链接', type: 'string' },
    { key: 'publishedDate', label: '发布日期', type: 'date' },
    { key: 'summary', label: '正文摘要', type: 'string' },
    { key: 'author', label: '作者', type: 'string' },
];
function contentText(blocks) {
    if (!Array.isArray(blocks))
        return '';
    return blocks
        .map((block) => {
        if (typeof block === 'object' && block !== null && block.type === 'text') {
            return String(block.text ?? '');
        }
        return '';
    })
        .filter(Boolean)
        .join('\n');
}
async function callTool(ctx, exec, name, args) {
    const executable = ctx.tools.executable(name, exec.agent);
    if (!executable) {
        throw new XhsError('DATA_TABLE_UNAVAILABLE', `工具 ${name} 不可用`);
    }
    const batch = await ctx.tools.execute({
        calls: [{
                type: 'tool-call',
                id: `xhs-${randomUUID()}`,
                name,
                arguments: JSON.stringify(args),
            }],
        signal: exec.signal,
        agent: exec.agent,
    });
    const entry = batch.results?.[0]?.result;
    if (!entry || entry.isError) {
        throw new XhsError('DATA_TABLE_UNAVAILABLE', contentText(entry?.content) || `${name} 调用失败`);
    }
    return entry.value;
}
async function ensureWorkbook(ctx, exec, config) {
    if (!ctx.tools.executable('workbook_catalog', exec.agent))
        return;
    try {
        const value = await callTool(ctx, exec, 'workbook_catalog', { action: 'list' });
        const exists = Array.isArray(value.workbooks)
            && value.workbooks.some((workbook) => workbook.id === config.dataTable.workbookId);
        if (exists)
            return;
        await callTool(ctx, exec, 'workbook_catalog', {
            action: 'create',
            name: config.dataTable.workbookName,
            workbookId: config.dataTable.workbookId,
        });
    }
    catch {
        // If the catalog is unavailable but workbook_edit works, the edit call
        // still has a chance. Its error is reported by the caller.
    }
}
/** Pure payload builder, also used by tests. */
export function buildTablePayload(config, notes, region, job, day, generatedAt) {
    const rows = notesToRows(notes);
    const contentHash = createHash('sha256')
        .update(JSON.stringify(rows))
        .digest('hex')
        .slice(0, 12);
    const targetHash = createHash('sha256')
        .update(`${region}|${job}`)
        .digest('hex')
        .slice(0, 8);
    const opId = `xhs-${day}-${targetHash}-${contentHash}`;
    return {
        workbookId: config.dataTable.workbookId,
        opId,
        versions: [{
                summary: `小红书招聘 ${region}/${job} ${day}`.slice(0, 280),
                intent: '追加每日招聘笔记',
                commands: [{
                        type: 'append_rows',
                        sheet: config.dataTable.sheetName,
                        name: config.dataTable.sheetName,
                        columns: DATA_TABLE_COLUMNS,
                        rows,
                        meta: {
                            source: 'xiaohongshu',
                            query: `${region} ${job} 招聘`,
                            generatedAt,
                            notes: `采集 ${notes.length} 条；由 xhs-job-hunter 写入`,
                        },
                    }],
            }],
    };
}
export async function writeToDataTable(ctx, exec, config, notes, region, job, day) {
    if (notes.length === 0)
        return { mode: 'none' };
    await ensureWorkbook(ctx, exec, config);
    const payload = buildTablePayload(config, notes, region, job, day, new Date().toISOString());
    const value = await callTool(ctx, exec, 'workbook_edit', payload);
    return {
        mode: 'data-table',
        workbookId: config.dataTable.workbookId,
        sheet: config.dataTable.sheetName,
        revision: Number(value.revisionAfter ?? value.revision ?? 0),
    };
}
//# sourceMappingURL=data-table.js.map