import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveConfig } from '../dist/config.js'
import { noteToRow } from '../dist/output/columns.js'
import { buildTablePayload } from '../dist/output/data-table.js'
import { writeFiles } from '../dist/output/files.js'
import { publish } from '../dist/output/publish.js'

function note(overrides = {}) {
  return {
    id: 'note-1',
    title: '北京前端招聘',
    url: 'https://www.xiaohongshu.com/explore/note-1',
    publishedAt: '2026-11-11T01:00:00.000Z',
    publishedText: '今天 09:00',
    summary: '招前端开发，React',
    author: '招聘君',
    region: '北京',
    job: '前端',
    query: '北京 前端 招聘',
    collectedAt: '2026-11-11T02:00:00.000Z',
    ...overrides,
  }
}

test('configuration defaults are stable', () => {
  const config = resolveConfig({})
  assert.equal(config.dataTable.workbookId, 'xhs-jobs')
  assert.equal(config.dataTable.sheetName, '招聘笔记')
  assert.deepEqual(config.export.formats, ['xlsx', 'csv'])
  assert.equal(config.freshnessHours, 24)
  assert.equal(config.hardMaxNotes, 50)
})

test('configuration rejects invalid values', () => {
  assert.throws(() => resolveConfig({ freshnessHours: 0 }), /freshnessHours/)
  assert.throws(() => resolveConfig({ export: { formats: ['pdf'] } }), /export.formats/)
  assert.throws(() => resolveConfig({ timezone: 'Mars/Olympus' }), /timezone/)
})

test('maps a note to the table row shape', () => {
  const row = noteToRow(note())
  assert.equal(row.region, '北京')
  assert.equal(row.publishedDate, '2026-11-11')
  assert.equal(row.author, '招聘君')
})

test('builds an idempotent append_rows payload', () => {
  const config = resolveConfig({})
  const payload = buildTablePayload(config, [note()], '北京', '前端', '2026-11-11', '2026-11-11T02:00:00.000Z')
  assert.equal(payload.workbookId, 'xhs-jobs')
  assert.match(String(payload.opId), /^xhs-2026-11-11-/)
  const version = payload.versions[0]
  assert.equal(version.commands[0].type, 'append_rows')
  assert.equal(version.commands[0].sheet, '招聘笔记')
  assert.equal(version.commands[0].rows[0].publishedDate, '2026-11-11')
  assert.equal(version.commands[0].columns.length, 7)
})

test('writes CSV and XLSX files', async () => {
  const config = resolveConfig({})
  const dir = await mkdtemp(join(tmpdir(), 'xhs-job-hunter-'))
  try {
    const files = await writeFiles(dir, '2026-11-11', [note()], config)
    assert.ok(files.csvPath)
    assert.ok(files.xlsxPath)
    assert.ok((await stat(files.csvPath)).size > 0)
    assert.ok((await stat(files.xlsxPath)).size > 0)

    const csv = await readFile(files.csvPath, 'utf8')
    assert.match(csv, /北京/)
    assert.match(csv, /北京前端招聘/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('publishes through workbook_catalog and workbook_edit when available', async () => {
  const config = resolveConfig({})
  const calls = []
  const ctx = {
    tools: {
      executable(name) {
        return name === 'workbook_catalog' || name === 'workbook_edit' ? {} : undefined
      },
      async execute(input) {
        const call = input.calls[0]
        calls.push({ name: call.name, args: JSON.parse(call.arguments) })
        if (call.name === 'workbook_catalog' && calls.length === 1) {
          return { results: [{ result: { isError: false, value: { workbooks: [] } } }] }
        }
        if (call.name === 'workbook_catalog') {
          return { results: [{ result: { isError: false, value: { ok: true } } }] }
        }
        return { results: [{ result: { isError: false, value: { revisionAfter: 7 } } }] }
      },
    },
  }
  const exec = { signal: new AbortController().signal, agent: {} }

  const result = await publish({
    ctx,
    exec,
    config,
    baseDirectory: tmpdir(),
    notes: [note()],
    region: '北京',
    job: '前端',
  })

  assert.equal(result.mode, 'data-table')
  assert.equal(result.revision, 7)
  assert.deepEqual(calls.map((call) => call.name), ['workbook_catalog', 'workbook_catalog', 'workbook_edit'])
  assert.equal(calls[2].args.workbookId, 'xhs-jobs')
  assert.equal(calls[2].args.versions[0].commands[0].type, 'append_rows')
})
