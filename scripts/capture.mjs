// Stage 1: capture search results from the page's own v2 search API.
import fs from 'node:fs'
import path from 'node:path'
import { resolveConfig } from '../dist/config.js'
import { createRuntime } from '../dist/runtime/lock.js'
import { closePage } from '../dist/scraper/connect.js'
import { assertHumanState } from '../dist/scraper/human-check.js'
import { randomBetween } from '../dist/parse/normalize.js'

const baseDirectory = path.resolve(process.argv[2] ?? '.')
const region = process.argv[3] ?? '重庆'
const job = process.argv[4] ?? '用户运营'
const outFile = path.join(baseDirectory, '.cache', 'search-notes.json')

const config = resolveConfig({ safety: { dedupeEnabled: false, minIntervalSeconds: 0 } })
const runtime = createRuntime(config)
const chrome = await runtime.getChrome()
const page = await chrome.context.newPage()
const found = new Map()

page.on('response', async (response) => {
  if (!response.url().includes('/api/sns/web/v2/search/notes')) return
  try {
    const json = await response.json()
    for (const item of json?.data?.items ?? []) {
      const card = item?.note_card
      if (!card || !item.id || found.has(item.id)) continue
      const publish = (card.corner_tag_info ?? []).find((tag) => tag.type === 'publish_time')
      found.set(item.id, {
        id: item.id,
        xsecToken: item.xsec_token ?? '',
        title: card.display_title ?? '',
        author: card.user?.nickname ?? '',
        timeText: publish?.text ?? '',
        type: card.type ?? '',
        liked: card.interact_info?.liked_count ?? '',
      })
    }
  } catch {}
})

try {
  const searchUrl = new URL('https://www.xiaohongshu.com/search_result')
  searchUrl.searchParams.set('keyword', `${region} ${job} 招聘`)
  searchUrl.searchParams.set('source', 'web_search_result_notes')
  await page.goto(searchUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 })
  await assertHumanState(page)
  await page.waitForTimeout(3000)
  for (let round = 0; round < 25; round += 1) {
    await page.evaluate(() => window.scrollBy(0, 1300))
    await page.waitForTimeout(randomBetween(1000, 1600))
    if (found.size >= 90) break
  }
} finally {
  await closePage(page)
}

const notes = [...found.values()]
fs.writeFileSync(outFile, JSON.stringify({ region, job, query: `${region} ${job} 招聘`, capturedAt: new Date().toISOString(), notes }, null, 2), 'utf8')
console.log('captured ' + notes.length + ' notes -> ' + outFile)
process.exit(0)
