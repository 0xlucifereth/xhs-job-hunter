import type { JobNote, TableRow } from '../types.js'

export const TABLE_COLUMNS = [
  { key: 'region', label: '地区', type: 'string', width: 10 },
  { key: 'job', label: '岗位', type: 'string', width: 12 },
  { key: 'title', label: '标题', type: 'string', width: 42 },
  { key: 'url', label: '链接', type: 'string', width: 58 },
  { key: 'publishedDate', label: '发布日期', type: 'date', width: 14 },
  { key: 'summary', label: '正文摘要', type: 'string', width: 64 },
  { key: 'author', label: '作者', type: 'string', width: 18 },
] as const

export function noteToRow(note: JobNote): TableRow {
  return {
    region: note.region,
    job: note.job,
    title: note.title,
    url: note.url,
    publishedDate: note.publishedAt === null ? '' : note.publishedAt.slice(0, 10),
    summary: note.summary,
    author: note.author,
  }
}

export function notesToRows(notes: readonly JobNote[]): TableRow[] {
  return notes.map(noteToRow)
}
