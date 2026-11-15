import type { Context } from '@deepseek-ai/cordis'
import type { ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { ResolvedConfig } from './config.js'
import { toErrorMessage } from './errors.js'
import { normalizeText, escapeMarkdownCell } from './parse/normalize.js'
import { publish } from './output/publish.js'
import { scrapeJobs } from './scraper/index.js'
import type { Runtime } from './runtime/lock.js'
import { markSeen } from './runtime/state.js'
import { workspaceBase } from './runtime/paths.js'
import type { ScrapeMeta, ScrapeResult } from './types.js'

const noteSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'title',
    'url',
    'publishedAt',
    'publishedText',
    'summary',
    'author',
    'region',
    'job',
    'query',
    'collectedAt',
  ],
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    url: { type: 'string' },
    publishedAt: {
      oneOf: [{ type: 'string' }, { type: 'null' }],
    },
    publishedText: { type: 'string' },
    summary: { type: 'string' },
    author: { type: 'string' },
    region: { type: 'string' },
    job: { type: 'string' },
    query: { type: 'string' },
    collectedAt: { type: 'string' },
  },
} as const

const skippedSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['seen', 'duplicate', 'stale', 'irrelevant', 'unparsedDate'],
  properties: {
    seen: { type: 'integer' },
    duplicate: { type: 'integer' },
    stale: { type: 'integer' },
    irrelevant: { type: 'integer' },
    unparsedDate: { type: 'integer' },
  },
} as const

const tableSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mode'],
  properties: {
    mode: { type: 'string', enum: ['data-table', 'files', 'none'] },
    workbookId: { type: 'string' },
    sheet: { type: 'string' },
    revision: { type: 'integer' },
    xlsxPath: { type: 'string' },
    csvPath: { type: 'string' },
    error: { type: 'string' },
  },
} as const

const outputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['notes', 'meta'],
  properties: {
    notes: {
      type: 'array',
      items: noteSchema,
    },
    meta: {
      type: 'object',
      additionalProperties: false,
      required: [
        'region',
        'job',
        'query',
        'requested',
        'returned',
        'skipped',
        'table',
        'warnings',
        'startedAt',
        'finishedAt',
      ],
      properties: {
        region: { type: 'string' },
        job: { type: 'string' },
        query: { type: 'string' },
        requested: { type: 'integer' },
        returned: { type: 'integer' },
        skipped: skippedSchema,
        table: tableSchema,
        warnings: {
          type: 'array',
          items: { type: 'string' },
        },
        startedAt: { type: 'string' },
        finishedAt: { type: 'string' },
      },
    },
  },
} as const

function cell(value: string): string {
  return escapeMarkdownCell(value)
}

function renderSummary(value: unknown): string {
  const result = value as ScrapeResult
  const { notes, meta } = result
  const lines: string[] = []

  lines.push(`采集完成：${meta.returned}/${meta.requested} 条（${meta.region} / ${meta.job}）`)

  if (meta.table.mode === 'data-table') {
    lines.push(
      `已写入表格：${meta.table.workbookId ?? '(未知工作簿)'} / ${meta.table.sheet ?? '(未知 sheet)'}`
      + (meta.table.revision === undefined ? '' : `（revision ${meta.table.revision}）`),
    )
  } else if (meta.table.mode === 'files') {
    if (meta.table.xlsxPath) lines.push(`已写出 Excel：${meta.table.xlsxPath}`)
    if (meta.table.csvPath) lines.push(`已写出 CSV：${meta.table.csvPath}`)
  } else {
    lines.push(`未写入表格${meta.table.error ? `：${meta.table.error}` : ''}`)
  }

  const skipped = meta.skipped
  const skippedParts = [
    skipped.seen > 0 ? `已见 ${skipped.seen}` : '',
    skipped.duplicate > 0 ? `重复 ${skipped.duplicate}` : '',
    skipped.stale > 0 ? `过期 ${skipped.stale}` : '',
    skipped.irrelevant > 0 ? `不相关 ${skipped.irrelevant}` : '',
    skipped.unparsedDate > 0 ? `日期未解析 ${skipped.unparsedDate}` : '',
  ].filter(Boolean)
  if (skippedParts.length > 0) lines.push(`跳过：${skippedParts.join('，')}`)

  if (notes.length > 0) {
    lines.push('')
    lines.push('| 标题 | 发布日期 | 作者 |')
    lines.push('|---|---|---|')
    for (const note of notes.slice(0, 20)) {
      const title = note.url ? `[${cell(note.title)}](${note.url})` : cell(note.title)
      lines.push(`| ${title} | ${note.publishedAt?.slice(0, 10) ?? '未知'} | ${cell(note.author || '未知')} |`)
    }
    if (notes.length > 20) {
      lines.push(`| …其余 ${notes.length - 20} 条 | | |`)
    }
  } else {
    lines.push('没有符合条件的新笔记。')
  }

  if (meta.warnings.length > 0) {
    lines.push('')
    lines.push('提示：')
    for (const warning of meta.warnings.slice(0, 5)) lines.push(`- ${warning}`)
  }

  return lines.join('\n')
}

export function registerXhsJobScrape(
  ctx: Context,
  config: ResolvedConfig,
  runtime: Runtime,
): () => void {
  const definition = {
    name: 'xhs_job_scrape',
    description:
      'Collect recent Xiaohongshu job posts from the user\'s already logged-in Chrome. '
      + 'Use when the user asks to scrape or search Xiaohongshu recruitment notes for a region and job. '
      + 'Returns structured notes, writes them to the interactive dsh-data-table workbook when available, '
      + 'and falls back to CSV/XLSX. Stops on login or verification challenges; never bypasses them.',
    parameters: {
      region: {
        type: 'string',
        required: true,
        description: 'City or region, e.g. 北京. Required.',
      },
      job: {
        type: 'string',
        required: true,
        description: 'Job keyword, e.g. 前端. Required.',
      },
      max_notes: {
        type: 'integer',
        required: false,
        default: 30,
        description: 'Maximum notes to return, 1-50 (the host hard limit can lower this). Defaults to 30.',
      },
    },
    output: {
      schema: outputSchema,
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: renderSummary(value) }],
    },
    timeoutMs: config.toolTimeoutMs,
    isConcurrencySafe: () => false,
    async execute(args: unknown, exec: ToolRunContext): Promise<unknown> {
      const input = args as { region?: unknown; job?: unknown; max_notes?: unknown }
      const region = normalizeText(input.region)
      const job = normalizeText(input.job)
      if (!region) throw new Error('region 不能为空')
      if (!job) throw new Error('job 不能为空')

      const requested = input.max_notes === undefined ? 30 : Number(input.max_notes)
      if (!Number.isFinite(requested) || !Number.isInteger(requested) || requested < 1) {
        throw new Error('max_notes 必须是 1-50 的整数')
      }
      const maxNotes = Math.min(requested, config.hardMaxNotes, 50)

      return runtime.runExclusive(async () => {
        const baseDirectory = workspaceBase(ctx, exec)
        const result = await scrapeJobs({
          config,
          runtime,
          baseDirectory,
          region,
          job,
          maxNotes,
          signal: exec.signal,
        })

        const table = await publish({
          ctx,
          exec,
          config,
          baseDirectory,
          notes: result.notes,
          region,
          job,
        })

        if (table.mode !== 'none' && config.safety.dedupeEnabled) {
          await markSeen(baseDirectory, config, result.notes)
        }

        return {
          notes: result.notes,
          meta: {
            ...result.meta,
            table,
          },
        } satisfies ScrapeResult
      })
    },
    presentCall: (args: unknown) => {
      const input = args as { region?: unknown; job?: unknown }
      return {
        card: 'generic',
        title: `抓取小红书招聘：${String(input.region ?? '')} / ${String(input.job ?? '')}`,
        kind: 'fetch',
      }
    },
    presentResult: (args: unknown, result: { content: unknown[]; isError: boolean }) => {
      if (result.isError) return undefined
      const input = args as { region?: unknown; job?: unknown }
      return {
        card: 'generic',
        title: `小红书招聘：${String(input.region ?? '')} / ${String(input.job ?? '')}`,
        content: result.content,
      }
    },
  } as unknown as ToolDefinition

  return ctx.tools.register(definition)
}

/** Exposed for tests. */
export function summarizeForTest(value: ScrapeResult): string {
  return renderSummary(value)
}

export function emptyMeta(): ScrapeMeta {
  return {
    region: '',
    job: '',
    query: '',
    requested: 0,
    returned: 0,
    skipped: { seen: 0, duplicate: 0, stale: 0, irrelevant: 0, unparsedDate: 0 },
    table: { mode: 'none' },
    warnings: [],
    startedAt: new Date(0).toISOString(),
    finishedAt: new Date(0).toISOString(),
  }
}

export function errorText(error: unknown): string {
  return toErrorMessage(error)
}
