import type { Locator, Page } from 'playwright-core'
import type { ResolvedConfig } from '../config.js'
import { throwIfAborted } from '../errors.js'
import type { SearchCard } from '../types.js'
import { canonicalNoteUrl, normalizeText, noteIdFromUrl, randomBetween, truncateText } from '../parse/normalize.js'
import { assertHumanState } from './human-check.js'
import {
  CARD_AUTHOR_SELECTORS,
  CARD_DESC_SELECTORS,
  CARD_SELECTORS,
  CARD_TIME_SELECTORS,
  CARD_TITLE_SELECTORS,
  NOTE_LINK_SELECTOR,
} from './selectors.js'

export function buildSearchUrl(region: string, job: string): string {
  const query = `${region} ${job} 招聘`
  const url = new URL('https://www.xiaohongshu.com/search_result')
  url.searchParams.set('keyword', query)
  url.searchParams.set('source', 'web_search_result_notes')
  return url.toString()
}

async function firstText(scope: Page | Locator, selectors: readonly string[]): Promise<string> {
  for (const selector of selectors) {
    const locator = scope.locator(selector).first()
    const count = await locator.count().catch(() => 0)
    if (count === 0) continue
    const text = await locator.textContent({ timeout: 800 }).catch(() => null)
    const normalized = normalizeText(text)
    if (normalized) return normalized
  }
  return ''
}

async function pickCardSelector(page: Page): Promise<string | null> {
  for (const selector of CARD_SELECTORS) {
    const count = await page.locator(selector).count().catch(() => 0)
    if (count > 0) return selector
  }
  return null
}

async function extractCard(card: Locator, baseUrl: string): Promise<SearchCard | null> {
  const link = card.locator(NOTE_LINK_SELECTOR).first()
  const href = await link.getAttribute('href', { timeout: 1_000 }).catch(() => null)
  if (!href) return null

  const url = canonicalNoteUrl(href, baseUrl)
  const id = noteIdFromUrl(url)
  if (!id) return null

  const title = truncateText(await firstText(card, CARD_TITLE_SELECTORS), 160)
  const summary = truncateText(await firstText(card, CARD_DESC_SELECTORS), 600)
  const author = truncateText(await firstText(card, CARD_AUTHOR_SELECTORS), 80)
  const publishedText = truncateText(await firstText(card, CARD_TIME_SELECTORS), 80)

  return {
    id,
    url,
    title: title || truncateText(summary.split(/[。！？!?\n]/)[0] ?? '', 80) || '(无标题)',
    author,
    publishedText,
    summary,
  }
}

/** Fallback for a redesigned feed: mine every note link and its nearest block. */
async function extractFallbackCards(page: Page, baseUrl: string): Promise<SearchCard[]> {
  const anchors = page.locator(NOTE_LINK_SELECTOR)
  const count = Math.min(await anchors.count().catch(() => 0), 80)
  const cards: SearchCard[] = []

  for (let index = 0; index < count; index += 1) {
    const anchor = anchors.nth(index)
    const href = await anchor.getAttribute('href', { timeout: 600 }).catch(() => null)
    if (!href) continue
    const url = canonicalNoteUrl(href, baseUrl)
    const id = noteIdFromUrl(url)
    if (!id) continue

    const text = await anchor
      .evaluate((element) => {
        const container = element.closest('section, article, li') as HTMLElement | null
        const parent = element.parentElement as HTMLElement | null
        return container?.innerText ?? parent?.innerText ?? ''
      })
      .catch(() => '')
    const lines = text
      .split(/\r?\n/)
      .map((line: string) => normalizeText(line))
      .filter((line: string) => Boolean(line))
    const time = lines.find((line) => /(刚刚|分钟前|小时前|天前|今天|昨天|\d{1,2}[-/月]\d{1,2}|\d{1,2}:\d{2})/.test(line)) ?? ''

    cards.push({
      id,
      url,
      title: truncateText(lines[0] ?? '(无标题)', 160),
      author: '',
      publishedText: time,
      summary: truncateText(lines.join(' '), 600),
    })
  }

  return cards
}

export async function extractCards(page: Page): Promise<SearchCard[]> {
  const selector = await pickCardSelector(page)
  const cards: SearchCard[] = []

  if (selector !== null) {
    const locator = page.locator(selector)
    const count = Math.min(await locator.count().catch(() => 0), 120)
    for (let index = 0; index < count; index += 1) {
      const card = await extractCard(locator.nth(index), page.url()).catch(() => null)
      if (card) cards.push(card)
    }
  }

  if (cards.length === 0) {
    cards.push(...(await extractFallbackCards(page, page.url())))
  }

  const deduped = new Map<string, SearchCard>()
  for (const card of cards) {
    if (!deduped.has(card.id)) deduped.set(card.id, card)
  }
  return [...deduped.values()]
}

/**
 * Scroll the search feed and collect cards incrementally. The DOM may recycle
 * cards while scrolling, so each round merges into a map instead of collecting
 * everything at the end.
 */
export async function collectSearchCards(
  page: Page,
  config: ResolvedConfig,
  maxCandidates: number,
  signal: AbortSignal,
): Promise<SearchCard[]> {
  const cards = new Map<string, SearchCard>()
  let stagnantRounds = 0

  await page.waitForTimeout(1_200)

  for (let round = 0; round < config.maxScrolls; round += 1) {
    throwIfAborted(signal)
    const batch = await extractCards(page)
    for (const card of batch) {
      if (!cards.has(card.id)) cards.set(card.id, card)
    }
    if (cards.size >= maxCandidates) break

    const before = cards.size
    await page.mouse.move(640, 420).catch(() => undefined)
    await page.mouse.wheel(0, randomBetween(900, 1_500)).catch(() => undefined)
    await page.evaluate(() => window.scrollBy(0, 600)).catch(() => undefined)
    await page.waitForTimeout(randomBetween(config.scrollDelayMinMs, config.scrollDelayMaxMs))
    await assertHumanState(page)

    if (cards.size === before) stagnantRounds += 1
    else stagnantRounds = 0
    if (stagnantRounds >= 3) break
  }

  return [...cards.values()]
}
