import { getDatabase } from '../database'
import type { Collection } from '../../../shared/types'

function rowToCollection(row: Record<string, unknown>): Collection {
  return {
    id: row.id as string,
    name: row.name as string,
    series: row.series as string | undefined,
    total: row.total as number | undefined,
    releaseDate: row.release_date as string | undefined,
    symbolUrl: row.symbol_url as string | undefined,
    logoUrl: row.logo_url as string | undefined,
    ptcgoCode: row.ptcgo_code as string | undefined,
  }
}

export const collectionRepo = {
  upsert(collection: Collection): void {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO collections (id, name, series, total, release_date, symbol_url, logo_url, ptcgo_code, synced_at)
      VALUES (@id, @name, @series, @total, @releaseDate, @symbolUrl, @logoUrl, @ptcgoCode, @syncedAt)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        series = excluded.series,
        total = excluded.total,
        release_date = excluded.release_date,
        symbol_url = excluded.symbol_url,
        logo_url = excluded.logo_url,
        ptcgo_code = excluded.ptcgo_code,
        synced_at = excluded.synced_at
    `).run({
      id: collection.id,
      name: collection.name,
      series: collection.series ?? null,
      total: collection.total ?? null,
      releaseDate: collection.releaseDate ?? null,
      symbolUrl: collection.symbolUrl ?? null,
      logoUrl: collection.logoUrl ?? null,
      ptcgoCode: collection.ptcgoCode ?? null,
      syncedAt: new Date().toISOString(),
    })
  },

  findAll(): Collection[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM collections ORDER BY name ASC').all() as Record<string, unknown>[]
    return rows.map(rowToCollection)
  },

  findById(id: string): Collection | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? rowToCollection(row) : null
  },
}
