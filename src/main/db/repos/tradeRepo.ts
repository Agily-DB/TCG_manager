import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database'
import type { Trade, TradeDetail, TradeCard, CreateTradeDTO } from '../../../shared/types'
import { cardRepo } from './cardRepo'

function rowToTradeCard(row: Record<string, unknown>): TradeCard {
  return {
    id: row.id as string,
    tradeId: row.trade_id as string,
    cardId: row.card_id as string | undefined,
    card: row.card_id ? cardRepo.findById(row.card_id as string) ?? undefined : undefined,
    direction: row.direction as 'given' | 'received',
    cardName: row.card_name as string | undefined,
    cardNumber: row.card_number as string | undefined,
    collectionName: row.collection_name as string | undefined,
  }
}

export const tradeRepo = {
  create(data: CreateTradeDTO): Trade {
    const db = getDatabase()
    const tradeId = uuidv4()

    const doCreate = db.transaction(() => {
      db.prepare('INSERT INTO trades (id, traded_at, notes) VALUES (?, ?, ?)').run(
        tradeId,
        data.tradedAt,
        data.notes ?? null
      )

      // Remove given cards from user_collection
      for (const given of data.given) {
        const entry = db.prepare(
          'SELECT id, quantity FROM user_collection_entries WHERE card_id = ?'
        ).get(given.cardId) as { id: string; quantity: number } | undefined

        if (entry) {
          if (entry.quantity > 1) {
            db.prepare(
              'UPDATE user_collection_entries SET quantity = quantity - 1 WHERE id = ?'
            ).run(entry.id)
          } else {
            db.prepare('DELETE FROM user_collection_entries WHERE id = ?').run(entry.id)
          }
        }

        db.prepare(`
          INSERT INTO trade_cards (id, trade_id, card_id, direction)
          VALUES (?, ?, ?, 'given')
        `).run(uuidv4(), tradeId, given.cardId)
      }

      // Add received cards to user_collection
      for (const received of data.received) {
        db.prepare(`
          INSERT INTO trade_cards (id, trade_id, card_id, direction, card_name, card_number, collection_name)
          VALUES (@id, @tradeId, @cardId, 'received', @cardName, @cardNumber, @collectionName)
        `).run({
          id: uuidv4(),
          tradeId,
          cardId: received.cardId ?? null,
          cardName: received.cardName ?? null,
          cardNumber: received.cardNumber ?? null,
          collectionName: received.collectionName ?? null,
        })

        if (received.cardId) {
          const existing = db.prepare(
            'SELECT id FROM user_collection_entries WHERE card_id = ?'
          ).get(received.cardId) as { id: string } | undefined

          if (existing) {
            db.prepare(
              'UPDATE user_collection_entries SET quantity = quantity + 1 WHERE id = ?'
            ).run(existing.id)
          } else {
            db.prepare(`
              INSERT INTO user_collection_entries (id, card_id, quantity, registered_at)
              VALUES (?, ?, 1, ?)
            `).run(uuidv4(), received.cardId, new Date().toISOString())
          }
        }
      }
    })

    doCreate()

    return { id: tradeId, tradedAt: data.tradedAt, notes: data.notes }
  },

  findAll(): Trade[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM trades ORDER BY traded_at DESC').all() as Record<string, unknown>[]
    return rows.map((row) => ({
      id: row.id as string,
      tradedAt: row.traded_at as string,
      notes: row.notes as string | undefined,
    }))
  },

  findById(id: string): TradeDetail | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return null

    const tradeCardRows = db.prepare(
      'SELECT * FROM trade_cards WHERE trade_id = ?'
    ).all(id) as Record<string, unknown>[]

    const allCards = tradeCardRows.map(rowToTradeCard)

    return {
      id: row.id as string,
      tradedAt: row.traded_at as string,
      notes: row.notes as string | undefined,
      given: allCards.filter((c) => c.direction === 'given'),
      received: allCards.filter((c) => c.direction === 'received'),
    }
  },
}
