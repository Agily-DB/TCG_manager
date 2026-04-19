import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database'
import type { UserCollectionEntry, CollectionSummary } from '../../../shared/types'
import { cardRepo } from './cardRepo'
import { collectionRepo } from './collectionRepo'

function rowToEntry(row: Record<string, unknown>): UserCollectionEntry {
  const card = cardRepo.findById(row.card_id as string)!
  return {
    id: row.id as string,
    cardId: row.card_id as string,
    card,
    productUnitId: row.product_unit_id as string | undefined,
    quantity: row.quantity as number,
    lastPrice: row.last_price as number | undefined,
    buyLink: row.buy_link as string | undefined,
    priceUpdatedAt: row.price_updated_at as string | undefined,
    registeredAt: row.registered_at as string,
  }
}

export const userCollectionRepo = {
  addOrIncrement(cardId: string, productUnitId?: string): void {
    const db = getDatabase()
    const existing = db.prepare(
      'SELECT id, quantity FROM user_collection_entries WHERE card_id = ?'
    ).get(cardId) as { id: string; quantity: number } | undefined

    if (existing) {
      db.prepare(
        'UPDATE user_collection_entries SET quantity = quantity + 1 WHERE id = ?'
      ).run(existing.id)
    } else {
      db.prepare(`
        INSERT INTO user_collection_entries (id, card_id, product_unit_id, quantity, registered_at)
        VALUES (@id, @cardId, @productUnitId, 1, @registeredAt)
      `).run({
        id: uuidv4(),
        cardId,
        productUnitId: productUnitId ?? null,
        registeredAt: new Date().toISOString(),
      })
    }
  },

  findSummary(): CollectionSummary[] {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT
        c.id AS collection_id,
        COUNT(DISTINCT uce.card_id) AS distinct_card_count,
        COALESCE(SUM(uce.last_price), 0) AS total_value,
        MAX(uce.price_updated_at) AS last_price_update
      FROM user_collection_entries uce
      JOIN cards ca ON ca.id = uce.card_id
      JOIN collections c ON c.id = ca.collection_id
      GROUP BY c.id
    `).all() as Record<string, unknown>[]

    return rows.map((row) => {
      const collection = collectionRepo.findById(row.collection_id as string)!
      return {
        collection,
        distinctCardCount: row.distinct_card_count as number,
        totalValue: row.total_value as number,
        lastPriceUpdate: row.last_price_update as string | undefined,
      }
    })
  },

  findByCollection(collectionId: string): UserCollectionEntry[] {
    const db = getDatabase()
    const rows = db.prepare(`
      SELECT uce.*
      FROM user_collection_entries uce
      JOIN cards c ON c.id = uce.card_id
      WHERE c.collection_id = ?
    `).all(collectionId) as Record<string, unknown>[]
    return rows.map(rowToEntry)
  },

  updatePrice(cardId: string, price: number, buyLink: string): void {
    const db = getDatabase()
    db.prepare(`
      UPDATE user_collection_entries
      SET last_price = ?, buy_link = ?, price_updated_at = ?
      WHERE card_id = ?
    `).run(price, buyLink, new Date().toISOString(), cardId)
  },
}
