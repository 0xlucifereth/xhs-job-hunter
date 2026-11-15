import type { Browser, BrowserContext, Page } from 'playwright-core'
import { XhsError } from '../errors.js'

export interface ConnectedChrome {
  browser: Browser
  context: BrowserContext
  cdpUrl: string
}

/**
 * Attach to an already-running Chrome. The plugin never launches a browser and
 * never closes the user's browser; it only closes pages it creates.
 */
export async function connectChrome(cdpUrl: string): Promise<ConnectedChrome> {
  let browser: Browser
  try {
    const { chromium } = await import('playwright-core')
    browser = await chromium.connectOverCDP(cdpUrl, { timeout: 10_000 })
  } catch (error) {
    throw new XhsError(
      'CDP_UNAVAILABLE',
      `无法连接 Chrome CDP：${cdpUrl}。请先用 --remote-debugging-port=9222 启动 Chrome，并保持窗口打开。`,
      { cause: error },
    )
  }

  const context = browser.contexts()[0]
  if (!context) {
    throw new XhsError(
      'CDP_UNAVAILABLE',
      `已连接 ${cdpUrl}，但 Chrome 没有可用的 browser context。请先打开一个普通窗口。`,
    )
  }

  return { browser, context, cdpUrl }
}

export async function closePage(page: Page | undefined): Promise<void> {
  if (!page) return
  await page.close().catch(() => undefined)
}
