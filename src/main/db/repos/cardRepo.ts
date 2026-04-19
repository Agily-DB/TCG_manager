import { getDatabase } from '../database'
import type { Card, CardFilter } from '../../../shared/types'

function rowToCard(row: Record<string, unknown>): Card {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string,
    name: row.name as string,
    number: row.number as string,
    rarity: row.rarity as string | undefined,
    types: row.types ? JSON.parse(row.types as string) : undefined,
    imageSmall: row.image_small as string | undefined,
    imageLarge: row.image_large as string | undefined,
  }
}

export const cardRepo = {
  upsert(card: Card): void {
    const db = getDatabase()
    db.prepare(`
      INSERT INTO cards (id, collection_id, name, number, rarity, types, image_small, image_large)
      VALUES (@id, @collectionId, @name, @number, @rarity, @types, @imageSmall, @imageLarge)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        number = excluded.number,
        rarity = excluded.rarity,
        types = excluded.types,
        image_small = excluded.image_small,
        image_large = excluded.image_large
      ON CONFLICT(collection_id, number) DO UPDATE SET
        id = excluded.id,
        name = excluded.name,
        rarity = excluded.rarity,
        types = excluded.types,
        image_small = excluded.image_small,
        image_large = excluded.image_large
    `).run({
      id: card.id,
      collectionId: card.collectionId,
      name: card.name,
      number: card.number,
      rarity: card.rarity ?? null,
      types: card.types ? JSON.stringify(card.types) : null,
      imageSmall: card.imageSmall ?? null,
      imageLarge: card.imageLarge ?? null,
    })
  },

  findById(id: string): Card | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? rowToCard(row) : null
  },

  findByFilter(filter: CardFilter): Card[] {
    const db = getDatabase()
    const conditions: string[] = []
    const params: Record<string, unknown> = {}

    if (filter.collectionId) {
      conditions.push('collection_id = @collectionId')
      params.collectionId = filter.collectionId
    }

    if (filter.search) {
      conditions.push("(name LIKE @search ESCAPE '\\' OR number LIKE @search ESCAPE '\\')")
      const escaped = filter.search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
      params.search = `%${escaped}%`
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = db.prepare(`SELECT * FROM cards ${where} ORDER BY number ASC`).all(params) as Record<string, unknown>[]
    return rows.map(rowToCard)
  },
}
