export type XhsErrorCode =
  | 'CDP_UNAVAILABLE'
  | 'LOGIN_REQUIRED'
  | 'HUMAN_VERIFICATION_REQUIRED'
  | 'RATE_LIMITED'
  | 'NO_SEARCH_PAGE'
  | 'DATA_TABLE_UNAVAILABLE'
  | 'EXPORT_FAILED'
  | 'ABORTED'

export class XhsError extends Error {
  readonly code: XhsErrorCode

  constructor(code: XhsErrorCode, message: string, options?: ErrorOptions) {
    super(`[${code}] ${message}`, options)
    this.name = code
    this.code = code
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new XhsError('ABORTED', '任务已取消')
  }
}
