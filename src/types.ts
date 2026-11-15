/** Normalized note row returned by the scraper. */
export interface JobNote {
  id: string
  title: string
  url: string
  /** ISO timestamp, or null when the page date could not be parsed. */
  publishedAt: string | null
  /** Raw date text from the page, kept for auditing parse failures. */
  publishedText: string
  summary: string
  author: string
  region: string
  job: string
  query: string
  collectedAt: string
}

export interface TableResult {
  mode: 'data-table' | 'files' | 'none'
  workbookId?: string
  sheet?: string
  revision?: number
  xlsxPath?: string
  csvPath?: string
  error?: string
}

export interface SkippedCounts {
  seen: number
  duplicate: number
  stale: number
  irrelevant: number
  unparsedDate: number
}

export interface ScrapeMeta {
  region: string
  job: string
  query: string
  requested: number
  returned: number
  skipped: SkippedCounts
  table: TableResult
  warnings: string[]
  startedAt: string
  finishedAt: string
}

export interface ScrapeResult {
  notes: JobNote[]
  meta: ScrapeMeta
}

/** A search-result card before detail enrichment. */
export interface SearchCard {
  id: string
  url: string
  title: string
  author: string
  publishedText: string
  summary: string
}

/** Fields read from a note detail page. */
export interface NoteDetail {
  title: string
  author: string
  publishedText: string
  summary: string
}

export interface TableRow {
  region: string
  job: string
  title: string
  url: string
  publishedDate: string
  summary: string
  author: string
}
