import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ResolvedConfig } from '../config.js'
import { XhsError } from '../errors.js'
import type { JobNote } from '../types.js'
import { notesToRows, TABLE_COLUMNS } from './columns.js'
import { ensureDirectory, exportDirectory } from '../runtime/paths.js'

function csvCell(value: unknown): string {
  let text = String(value ?? '')
  // Neutralize spreadsheet formula prefixes.
  if (/^[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

function toCsv(notes: readonly JobNote[]): string {
  const rows = notesToRows(notes)
  const header = TABLE_COLUMNS.map((column) => csvCell(column.label)).join(',')
  const body = rows.map((row) => TABLE_COLUMNS.map((column) => csvCell(row[column.key])).join(','))
  return `\uFEFF${[header, ...body].join('\r\n')}\r\n`
}

export interface WrittenFiles {
  xlsxPath?: string
  csvPath?: string
}

export async function writeFiles(
  baseDirectory: string,
  day: string,
  notes: readonly JobNote[],
  config: ResolvedConfig,
): Promise<WrittenFiles> {
  if (notes.length === 0) return {}
  if (config.export.formats.length === 0) return {}

  const dir = exportDirectory(baseDirectory, day)
  await ensureDirectory(dir)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const baseName = `xhs-jobs-${day}-${stamp}`
  const result: WrittenFiles = {}

  try {
    if (config.export.formats.includes('xlsx')) {
      const { default: ExcelJS } = await import('exceljs')
      const xlsxPath = join(dir, `${baseName}.xlsx`)
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'xhs-job-hunter'
      workbook.created = new Date()
      const sheet = workbook.addWorksheet(config.dataTable.sheetName.slice(0, 31) || '招聘笔记')
      sheet.columns = TABLE_COLUMNS.map((column) => ({
        header: column.label,
        key: column.key,
        width: column.width,
      }))
      sheet.addRows(notesToRows(notes))
      sheet.getRow(1).font = { bold: true }
      sheet.views = [{ state: 'frozen', ySplit: 1 }]
      sheet.autoFilter = { from: 'A1', to: `G${Math.max(1, notes.length + 1)}` }
      await workbook.xlsx.writeFile(xlsxPath)
      result.xlsxPath = xlsxPath
    }

    if (config.export.formats.includes('csv')) {
      const csvPath = join(dir, `${baseName}.csv`)
      await writeFile(csvPath, toCsv(notes), 'utf8')
      result.csvPath = csvPath
    }
  } catch (error) {
    throw new XhsError('EXPORT_FAILED', `写出 CSV/XLSX 失败：${error instanceof Error ? error.message : String(error)}`)
  }

  return result
}
