import test from 'node:test'
import assert from 'node:assert/strict'
import { dedupeNotes, matchesJob, matchesRegion } from '../dist/parse/filters.js'

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

test('matches a job keyword and aliases case-insensitively', () => {
  assert.equal(matchesJob('招前端开发，React 方向', '前端'), true)
  assert.equal(matchesJob('招 FE，React 方向', '前端', ['FE']), true)
  assert.equal(matchesJob('招后端开发', '前端'), false)
})

test('matches a region only when the text mentions it', () => {
  assert.equal(matchesRegion('北京 朝阳 招前端', '北京'), true)
  assert.equal(matchesRegion('上海 招前端', '北京'), false)
})

test('dedupes by id, URL, and title plus author', () => {
  const notes = [
    note(),
    note({ id: 'note-2', url: 'https://www.xiaohongshu.com/explore/note-2' }),
    note({ id: 'note-3', url: 'https://www.xiaohongshu.com/explore/note-3', title: '另一个标题' }),
  ]
  assert.equal(dedupeNotes(notes).length, 2)
})
