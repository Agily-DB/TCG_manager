// Feature: pokemon-tcg-manager, Property 14: Deck nunca ultrapassa 60 cartas
import { describe, it, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import Database from 'better-sqlite3'
import { createTestDb } from './testDb'

// ─── Module mock setup ────────────────────────────────────────────────────────
let testDb: Database.Database

vi.mock('../../database', () => ({
  getDatabase: () => testDb,
  initDatabase: () => testDb,
}))

// Import repos AFTER the mock is registered
import { collectionRepo } from '../collectionRepo'
import { cardRepo } from '../cardRepo'
import { deckRepo } from '../deckRepo'

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** A single add-card operation: cardIndex (0..14) and quantity (1..4) */
const addOpArb = fc.record({
  cardIndex: fc.integer({ min: 0, max: 14 }),
  quantity: fc.integer({ min: 1, max: 4 }),
})

/** A sequence of 1..30 add-card operations */
const addOpsArb = fc.array(addOpArb, { minLength: 1, maxLength: 30 })

// ─── Property 14: Deck nunca ultrapassa 60 cartas ────────────────────────────

/**
 * Validates: Requirements 6.4
 *
 * Para qualquer sequência de operações addCard com cardIds e quantities
 * arbitrários, a soma total de quantities no deck nunca excede 60 —
 * ou a operação tem sucesso e o total permanece ≤ 60, ou lança um erro.
 */
describe('Property 14: Deck nunca ultrapassa 60 cartas', () => {
  beforeEach(() => {
    testDb = createTestDb()
  })

  it('sum(quantity) in deck never exceeds 60 after any sequence of addCard operations', () => {
    fc.assert(
      fc.property(addOpsArb, (ops) => {
        // Reset DB for each property run
        testDb = createTestDb()

        // Seed: one collection and 15 cards
        collectionRepo.upsert({ id: 'col-deck-limit', name: 'Test Collection' })
        const cardIds: string[] = []
        for (let i = 0; i < 15; i++) {
          const cardId = `card-dl-${i}`
          cardRepo.upsert({
            id: cardId,
            collectionId: 'col-deck-limit',
            name: `Card ${i}`,
            number: String(i + 1).padStart(3, '0'),
          })
          cardIds.push(cardId)
        }

        // Create a deck
        const deck = deckRepo.create('Test Deck')

        // Attempt each addCard operation; catch errors (limit violations)
        for (const op of ops) {
          const cardId = cardIds[op.cardIndex]
          try {
            deckRepo.addCard(deck.id, cardId, op.quantity)
          } catch {
            // Expected: either 60-card limit or 4-copy limit was hit
          }
        }

        // Verify the invariant: total cards in deck never exceeds 60
        const detail = deckRepo.findById(deck.id)
        if (!detail) return false

        return detail.totalCards <= 60
      }),
      { numRuns: 100 }
    )
  })
})
