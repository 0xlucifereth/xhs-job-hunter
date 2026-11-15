/** All brittle selectors live here so a XHS redesign is a one-file fix. */

export const NOTE_LINK_SELECTOR = 'a[href*="/explore/"], a[href*="/discovery/item/"]'

export const CARD_SELECTORS = [
  'section.note-item',
  'div.note-item',
  'div[class*="note-item"]',
  'div[class*="feed-item"]',
  'li[class*="note-item"]',
  'li[class*="note"]',
]

export const CARD_TITLE_SELECTORS = [
  '.title',
  '[class*="title"]',
  'h3',
  'h4',
]

export const CARD_AUTHOR_SELECTORS = [
  '.author .name',
  '.author-wrapper .name',
  '[class*="author"] [class*="name"]',
  '[class*="author"] [class*="nickname"]',
  '[class*="nickname"]',
]

export const CARD_TIME_SELECTORS = [
  '.time',
  '[class*="time"]',
  '[class*="date"]',
]

export const CARD_DESC_SELECTORS = [
  '.desc',
  '[class*="desc"]',
  '[class*="summary"]',
  '[class*="content"]',
]

export const DETAIL_TITLE_SELECTORS = [
  '#detail-title',
  '.note-content .title',
  '[class*="note-content"] [class*="title"]',
  '[class*="note-detail"] h1',
  'h1',
]

export const DETAIL_DESC_SELECTORS = [
  '#detail-desc',
  '.note-text',
  '[class*="note-content"] [class*="desc"]',
  '[class*="note-text"]',
  '[class*="desc"]',
]

export const DETAIL_AUTHOR_SELECTORS = [
  '.author-wrapper .username',
  '.author-container .name',
  '[class*="author"] [class*="username"]',
  '[class*="author"] [class*="name"]',
  '[class*="username"]',
]

export const DETAIL_TIME_SELECTORS = [
  '.note-content .date',
  '.publish-date',
  '[class*="note-content"] [class*="date"]',
  '[class*="publish"] [class*="time"]',
  'time',
]

export const LOGIN_SELECTORS = [
  '.login-container',
  '[class*="login-container"]',
  'text=手机号登录',
  'text=扫码登录',
  'text=登录后查看',
]

export const VERIFICATION_SELECTORS = [
  '[class*="captcha"]',
  '[class*="slider"]',
  '[class*="verify"]',
  '[role="dialog"]:has-text("安全验证")',
  '[role="dialog"]:has-text("滑块")',
  'text=请完成安全验证',
  'text=拖动滑块',
  '[class*="toast"]:has-text("访问频繁")',
  '[class*="toast"]:has-text("异常流量")',
]
