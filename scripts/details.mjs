// Stage 2: open selected notes and read the modal content (#detail-title / #detail-desc / .date / .username).
import fs from 'node:fs'
import path from 'node:path'
import { resolveConfig } from '../dist/config.js'
import { createRuntime } from '../dist/runtime/lock.js'
import { closePage } from '../dist/scraper/connect.js'
import { parsePublishedAt } from '../dist/parse/date.js'
import { normalizeText, randomBetween } from '../dist/parse/normalize.js'

const baseDirectory = path.resolve(process.argv[2] ?? '.')
const indexArg = process.argv[3] ?? 'all'
const outFile = path.join(baseDirectory, '.cache', 'note-details.json')

const source = JSON.parse(fs.readFileSync(path.join(baseDirectory, '.cache', 'search-notes.json'), 'utf8'))
const notes = source.notes
const targets = indexArg === 'all'
  ? notes.map((_, i) => i)
  : indexArg.split(',').map((v) => Number(v.trim())).filter((v) => Number.isInteger(v) && v >= 0 && v < notes.length)

const config = resolveConfig({ safety: { dedupeEnabled: false, minIntervalSeconds: 0 } })
const runtime = createRuntime(config)
const chrome = await runtime.getChrome()
const now = new Date()
const page = await chrome.context.newPage()
const rows = []
let stopped = ''

const BLOCK_TEXT = /请完成安全验证|拖动滑块|访问频繁|异常流量|操作过于频繁|当前笔记暂时无法浏览|笔记不存在/

try {
  let i = 0
  for (const target of targets) {
    i += 1
    const note = notes[target]
    const url = `https://www.xiaohongshu.com/explore/${note.id}?xsec_token=${encodeURIComponent(note.xsecToken)}&xsec_source=pc_search`
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('#detail-title, .note-content, .note-detail-mask', { timeout: 15000 }).catch(() => null)
      await page.waitForTimeout(randomBetween(600, 1200))
      const scraped = await page.evaluate(() => {
        const text = (selector) => {
          const el = document.querySelector(selector)
          return el ? (el.innerText || el.textContent || '').trim() : ''
        }
        return {
          title: text('#detail-title'),
          desc: text('#detail-desc'),
          author: text('.username'),
          dateText: text('.note-content .date') || text('.date'),
          mask: text('.note-detail-mask').slice(0, 3000),
          bodyHead: (document.body.innerText || '').slice(0, 600),
        }
      })
      const surface = `${scraped.title} ${scraped.desc} ${scraped.mask} ${scraped.bodyHead}`
      if (!scraped.desc && BLOCK_TEXT.test(surface)) {
        const reason = (surface.match(BLOCK_TEXT) ?? ['blocked'])[0]
        console.log(`[${i}/${targets.length}] STOP ${reason}`)
        stopped = reason
        break
      }
      const publishedText = scraped.dateText || note.timeText
      const published = parsePublishedAt(publishedText, now, 'Asia/Shanghai')
      rows.push({
        index: target,
        id: note.id,
        url,
        title: normalizeText(scraped.title || note.title),
        author: normalizeText(scraped.author || note.author),
        location: normalizeText(scraped.dateText.replace(/^[\d\-月日\s:]+/, '')),
        publishedText: normalizeText(publishedText),
        publishedAt: published ? published.toISOString() : null,
        desc: normalizeText(scraped.desc),
        tags: normalizeText((scraped.desc.match(/#[^\s#]+/g) ?? []).join(' ')),
      })
      console.log(`[${i}/${targets.length}] ok idx=${target} ${published ? published.toISOString().slice(0, 10) : '?'} len=${scraped.desc.length} ${normalizeText(scraped.title).slice(0, 36)}`)
    } catch (error) {
      console.log(`[${i}/${targets.length}] fail idx=${target} :: ${error.message}`)
    }
    await page.waitForTimeout(randomBetween(2000, 3800))
  }
} finally {
  await closePage(page)
}

fs.writeFileSync(outFile, JSON.stringify({
  region: source.region,
  job: source.job,
  collectedAt: new Date().toISOString(),
  stopped,
  rows,
}, null, 2), 'utf8')
console.log('saved ' + rows.length + ' rows -> ' + outFile + (stopped ? ' (stopped: ' + stopped + ')' : ''))
process.exit(0)
