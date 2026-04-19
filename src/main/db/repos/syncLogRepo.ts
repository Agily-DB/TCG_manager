import { getDatabase } from '../database'

export interface SyncLogEntry {
  id: number
  type: string
  status: string
  lastCollectionIndex: number
  startedAt: string
  finishedAt?: string
}

function rowToEntry(row: Record<string, unknown>): SyncLogEntry {
  return {
    id: row.id as number,
    type: row.type as string,
    status: row.status as string,
    lastCollectionIndex: row.last_collection_index as number,
    startedAt: row.started_at as string,
    finishedAt: row.finished_at as string | undefined,
  }
}

export const syncLogRepo = {
  createEntry(type: string): SyncLogEntry {
    const db = getDatabase()
    const now = new Date().toISOString()
    const result = db.prepare(`
      INSERT INTO sync_log (type, status, last_collection_index, started_at)
      VALUES (?, 'running', 0, ?)
    `).run(type, now)

    return {
      id: result.lastInsertRowid as number,
      type,
      status: 'running',
      lastCollectionIndex: 0,
      startedAt: now,
    }
  },

  updateEntry(id: number, data: Partial<Pick<SyncLogEntry, 'status' | 'lastCollectionIndex' | 'finishedAt'>>): void {
    const db = getDatabase()
    const fields: string[] = []
    const values: unknown[] = []

    if (data.status !== undefined) {
      fields.push('status = ?')
      values.push(data.status)
    }
    if (data.lastCollectionIndex !== undefined) {
      fields.push('last_collection_index = ?')
      values.push(data.lastCollectionIndex)
    }
    if (data.finishedAt !== undefined) {
      fields.push('finished_at = ?')
      values.push(data.finishedAt)
    }

    if (fields.length === 0) return
    values.push(id)
    db.prepare(`UPDATE sync_log SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  },

  getLastRunning(): SyncLogEntry | null {
    const db = getDatabase()
    const row = db.prepare(
      "SELECT * FROM sync_log WHERE status = 'running' ORDER BY started_at DESC LIMIT 1"
    ).get() as Record<string, unknown> | undefined
    return row ? rowToEntry(row) : null
  },

  // Call this once at app startup to clean up any stale 'running' entries
  // (process crashed or was killed without finalizing the log)
  cleanupStaleRunning(): void {
    const db = getDatabase()
    db.prepare(
      "UPDATE sync_log SET status = 'failed', finished_at = ? WHERE status = 'running'"
    ).run(new Date().toISOString())
  },

  getLastCompleted(): SyncLogEntry | null {
    const db = getDatabase()
    const row = db.prepare(
      "SELECT * FROM sync_log WHERE status = 'completed' ORDER BY finished_at DESC LIMIT 1"
    ).get() as Record<string, unknown> | undefined
    return row ? rowToEntry(row) : null
  },

  getLastFailed(): SyncLogEntry | null {
    const db = getDatabase()
    const row = db.prepare(
      "SELECT * FROM sync_log WHERE status = 'failed' ORDER BY started_at DESC LIMIT 1"
    ).get() as Record<string, unknown> | undefined
    return row ? rowToEntry(row) : null
  },
}
