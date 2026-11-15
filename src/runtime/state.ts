import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ResolvedConfig } from '../config.js'
import type { JobNote } from '../types.js'
import { ensureDirectory, stateDirectory } from './paths.js'

interface SeenEntry {
  url: string
  firstSeenAt: string
  lastSeenAt: string
}

interface SeenFile {
  version: 1
  items: Record<string, SeenEntry>
}

const EMPTY: SeenFile = { version: 1, items: {} }

function seenPath(base: string): string {
  return join(stateDirectory(base), 'seen.json')
}

export async function loadSeen(base: string): Promise<SeenFile> {
  try {
    const raw = await readFile(seenPath(base), 'utf8')
    const parsed = JSON.parse(raw) as Partial<SeenFile>
    if (parsed.version !== 1 || typeof parsed.items !== 'object' || parsed.items === null || Array.isArray(parsed.items)) {
      return { version: 1, items: {} }
    }
    return { version: 1, items: parsed.items }
  } catch {
    return { ...EMPTY, items: {} }
  }
}

export function isSeen(seen: SeenFile, id: string, now: Date, config: ResolvedConfig): boolean {
  if (!config.safety.dedupeEnabled || config.safety.seenWindowDays <= 0) return false
  const entry = seen.items[id]
  if (!entry) return false
  const last = Date.parse(entry.lastSeenAt)
  if (!Number.isFinite(last)) return false
  return now.getTime() - last <= config.safety.seenWindowDays * 86_400_000
}

export async function markSeen(base: string, config: ResolvedConfig, notes: readonly JobNote[]): Promise<void> {
  if (!config.safety.dedupeEnabled || notes.length === 0) return
  const seen = await loadSeen(base)
  const now = new Date().toISOString()
  const cutoff = Date.now() - Math.max(1, config.safety.seenWindowDays) * 86_400_000

  for (const [id, entry] of Object.entries(seen.items)) {
    const last = Date.parse(entry.lastSeenAt)
    if (!Number.isFinite(last) || last < cutoff) delete seen.items[id]
  }

  for (const note of notes) {
    const previous = seen.items[note.id]
    seen.items[note.id] = {
      url: note.url,
      firstSeenAt: previous?.firstSeenAt ?? now,
      lastSeenAt: now,
    }
  }

  await ensureDirectory(stateDirectory(base))
  const target = seenPath(base)
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, JSON.stringify(seen, null, 2), 'utf8')
  await rename(temporary, target)
}
