import { resolveConfig } from '../dist/config.js'
import { closePage, connectChrome } from '../dist/scraper/connect.js'
import { extractDetail } from '../dist/scraper/detail.js'
import { assertHumanState } from '../dist/scraper/human-check.js'
import { buildSearchUrl, collectSearchCards } from '../dist/scraper/search.js'

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1 || process.argv[index + 1] === undefined) return fallback
  return process.argv[index + 1]
}

const region = arg('region', '北京')
const job = arg('job', '前端')
const maxNotes = Number(arg('max', '3'))
const config = resolveConfig({ maxScrolls: 3, safety: { minIntervalSeconds: 0 } })

let page
try {
  const chrome = await connectChrome(config.cdpUrl)
  page = await chrome.context.newPage()
  page.setDefaultTimeout(15_000)
  await page.goto(buildSearchUrl(region, job), { waitUntil: 'domcontentloaded', timeout: 25_000 })
  await assertHumanState(page)

  const cards = await collectSearchCards(page, config, Math.max(3, maxNotes * 2), new AbortController().signal)
  console.log(`cards=${cards.length}`)
  if (cards[0]) {
    console.log(JSON.stringify(cards[0], null, 2))
    await page.goto(cards[0].url, { waitUntil: 'domcontentloaded', timeout: 25_000 })
    await assertHumanState(page)
    console.log(JSON.stringify(await extractDetail(page, cards[0]), null, 2))
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
} finally {
  await closePage(page)
}
