import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database'
import type { Deck, DeckDetail, UpdateDeckDTO } from '../../../shared/types'
import { cardRepo } from './cardRepo'

function rowToDeck(row: Record<string, unknown>): Deck {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export const deckRepo = {
  create(name: string): Deck {
    const db = getDatabase()
    const id = uuidv4()
    const now = new Date().toISOString()
    db.prepare('INSERT INTO decks (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, name, now, now)
    return { id, name, createdAt: now, updatedAt: now }
  },

  findAll(): Deck[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM decks ORDER BY created_at DESC').all() as Record<string, unknown>[]
    return rows.map(rowToDeck)
  },

  findById(id: string): DeckDetail | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM decks WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return null

    const deck = rowToDeck(row)
    const cardRows = db.prepare(
      'SELECT card_id, quantity FROM deck_cards WHERE deck_id = ?'
    ).all(id) as Array<{ card_id: string; quantity: number }>

    const cards = cardRows.map((r) => ({
      card: cardRepo.findById(r.card_id)!,
      quantity: r.quantity,
    }))

    const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0)

    return { ...deck, cards, totalCards }
  },

  update(id: string, data: UpdateDeckDTO): void {
    const db = getDatabase()
    const now = new Date().toISOString()

    const updateDeck = db.transaction(() => {
      if (data.name !== undefined) {
        db.prepare('UPDATE decks SET name = ?, updated_at = ? WHERE id = ?').run(data.name, now, id)
      }

      if (data.cards !== undefined) {
        db.prepare('DELETE FROM deck_cards WHERE deck_id = ?').run(id)
        const insert = db.prepare('INSERT INTO deck_cards (deck_id, card_id, quantity) VALUES (?, ?, ?)')
        for (const c of data.cards) {
          insert.run(id, c.cardId, c.quantity)
        }
        db.prepare('UPDATE decks SET updated_at = ? WHERE id = ?').run(now, id)
      }
    })

    updateDeck()
  },

  delete(id: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM decks WHERE id = ?').run(id)
  },

  addCard(deckId: string, cardId: string, qty: number): void {
    const db = getDatabase()

    const totalRow = db.prepare(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM deck_cards WHERE deck_id = ?'
    ).get(deckId) as { total: number }

    if (totalRow.total + qty > 60) {
      throw new Error('Deck cannot exceed 60 cards')
    }

    const cardRow = db.prepare(
      'SELECT quantity FROM deck_cards WHERE deck_id = ? AND card_id = ?'
    ).get(deckId, cardId) as { quantity: number } | undefined

    const currentQty = cardRow?.quantity ?? 0
    if (currentQty + qty > 4) {
      throw new Error('Cannot have more than 4 copies of the same card in a deck')
    }

    if (cardRow) {
      db.prepare(
        'UPDATE deck_cards SET quantity = quantity + ? WHERE deck_id = ? AND card_id = ?'
      ).run(qty, deckId, cardId)
    } else {
      db.prepare(
        'INSERT INTO deck_cards (deck_id, card_id, quantity) VALUES (?, ?, ?)'
      ).run(deckId, cardId, qty)
    }

    db.prepare('UPDATE decks SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), deckId)
  },

  removeCard(deckId: string, cardId: string): void {
    const db = getDatabase()
    db.prepare('DELETE FROM deck_cards WHERE deck_id = ? AND card_id = ?').run(deckId, cardId)
    db.prepare('UPDATE decks SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), deckId)
  },
}
