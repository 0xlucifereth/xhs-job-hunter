import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'

/** Resolve the current session workspace, falling back to the host process cwd. */
export function workspaceBase(ctx: Context, exec: ToolRunContext): string {
  const service = (ctx as unknown as {
    get?: (name: string) => { get?: (session: unknown) => string } | undefined
  }).get?.('workingDirectory')
  const session = (exec.agent as unknown as { session?: unknown } | undefined)?.session
  if (service?.get && session) {
    try {
      return service.get(session)
    } catch {
      // Fall through to the process cwd.
    }
  }
  return process.cwd()
}

export function stateDirectory(base: string): string {
  return join(base, '.xhs-job-hunter')
}

export function exportDirectory(base: string, day: string): string {
  return join(base, 'xhs-job-hunter', day)
}

export async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true })
}
