import type { Context } from '@deepseek-ai/cordis'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { ResolvedConfig } from '../config.js'
import { toErrorMessage } from '../errors.js'
import { formatDay } from '../parse/date.js'
import type { JobNote, TableResult } from '../types.js'
import { writeToDataTable } from './data-table.js'
import { writeFiles } from './files.js'

export interface PublishInput {
  ctx: Context
  exec: ToolRunContext
  config: ResolvedConfig
  baseDirectory: string
  notes: readonly JobNote[]
  region: string
  job: string
}

/**
 * Prefer the interactive dsh-data-table workbook. If it is missing or rejects
 * the write, keep the scrape useful by writing CSV/XLSX into the workspace.
 */
export async function publish(input: PublishInput): Promise<TableResult> {
  const { ctx, exec, config, baseDirectory, notes, region, job } = input
  if (notes.length === 0) return { mode: 'none' }

  const day = formatDay(new Date(), config.timezone)
  let dataTableError: string | undefined

  if (config.dataTable.enabled) {
    try {
      return await writeToDataTable(ctx, exec, config, notes, region, job, day)
    } catch (error) {
      dataTableError = toErrorMessage(error)
    }
  }

  if (config.export.enabled && config.export.formats.length > 0) {
    try {
      const files = await writeFiles(baseDirectory, day, notes, config)
      if (!files.xlsxPath && !files.csvPath) {
        return {
          mode: 'none',
          error: [dataTableError, '没有可写出的 CSV/XLSX 格式'].filter(Boolean).join('；'),
        }
      }
      return {
        mode: 'files',
        ...files,
        ...(dataTableError === undefined ? {} : { error: dataTableError }),
      }
    } catch (error) {
      return {
        mode: 'none',
        error: [dataTableError, toErrorMessage(error)].filter(Boolean).join('；'),
      }
    }
  }

  return {
    mode: 'none',
    error: dataTableError ?? '表格不可用，且未启用 CSV/XLSX 导出。',
  }
}
