import test from 'node:test'
import assert from 'node:assert/strict'
import { formatDay, isFresh, parsePublishedAt } from '../dist/parse/date.js'

const now = new Date('2026-11-11T02:00:00.000Z') // 2026-11-11 10:00 Asia/Shanghai

test('parses Chinese relative times in Asia/Shanghai', () => {
  assert.equal(parsePublishedAt('今天 09:30', now, 'Asia/Shanghai')?.toISOString(), '2026-11-11T01:30:00.000Z')
  assert.equal(parsePublishedAt('昨天 22:10', now, 'Asia/Shanghai')?.toISOString(), '2026-11-10T14:10:00.000Z')
  assert.equal(parsePublishedAt('3天前', now, 'Asia/Shanghai')?.toISOString(), '2026-11-08T02:00:00.000Z')
  assert.equal(parsePublishedAt('刚刚', now, 'Asia/Shanghai')?.toISOString(), now.toISOString())
})

test('parses month-day and full dates without a year', () => {
  assert.equal(parsePublishedAt('11-10', now, 'Asia/Shanghai')?.toISOString(), '2026-11-09T16:00:00.000Z')
  assert.equal(parsePublishedAt('2026-01-02 08:00', now, 'Asia/Shanghai')?.toISOString(), '2026-01-01T16:00:00.000Z')
  assert.equal(
    parsePublishedAt('2026-11-11T10:00:00+08:00', now, 'Asia/Shanghai')?.toISOString(),
    '2026-11-11T02:00:00.000Z',
  )
})

test('returns null for unrecognized text', () => {
  assert.equal(parsePublishedAt('北京 · 招聘', now, 'Asia/Shanghai'), null)
  assert.equal(parsePublishedAt('', now, 'Asia/Shanghai'), null)
})

test('freshness uses the configured hour window', () => {
  const fresh = new Date(now.getTime() - 60 * 60 * 1000)
  const stale = new Date(now.getTime() - 30 * 60 * 60 * 1000)
  assert.equal(isFresh(fresh, now, 24), true)
  assert.equal(isFresh(stale, now, 24), false)
  assert.equal(isFresh(null, now, 24), false)
})

test('formats the local calendar day', () => {
  assert.equal(formatDay(now, 'Asia/Shanghai'), '2026-11-11')
})
