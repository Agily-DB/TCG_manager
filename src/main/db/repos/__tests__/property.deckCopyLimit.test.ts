// Feature: pokemon-tcg-manager, Property 15: Deck nunca contém mais de 4 cópias da mesma carta
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

/** A sequence of 1..20 quantities to add for a single card */
const addQuantitiesArb = fc.array(fc.integer({ min: 1, max: 4 }), { minLength: 1, maxLength: 20 })

// ─── Property 15: Deck nunca contém mais de 4 cópias da mesma carta ──────────

/**
 * **Validates: Requirements 6.6**
 *
 * Para qualquer sequência de adições da mesma carta, a quantidade dessa carta
 * no deck nunca excede 4 — ou a operação tem sucesso e a quantidade permanece
 * ≤ 4, ou lança um erro.
 */
describe('Property 15: Deck nunca contém mais de 4 cópias da mesma carta', () => {
  beforeEach(() => {
    testDb = createTestDb()
  })

  it('quantity of the same card in a deck never exceeds 4 after any sequence of addCard operations', () => {
    fc.assert(
      fc.property(addQuantitiesArb, (quantities) => {
        // Reset DB for each property run
        testDb = createTestDb()

        // Seed: one collection and one card
        collectionRepo.upsert({ id: 'col-copy-limit', name: 'Test Collection' })
        cardRepo.upsert({
          id: 'card-copy-limit-1',
          collectionId: 'col-copy-limit',
          name: 'Pikachu',
          number: '001',
        })

        // Create a deck
        const deck = deckRepo.create('Test Deck')

        // Attempt each addCard operation for the same card; catch errors (limit violations)
        for (const qty of quantities) {
          try {
            deckRepo.addCard(deck.id, 'card-copy-limit-1', qty)
          } catch {
            // Expected: either 4-copy limit or 60-card limit was hit
          }
        }

        // Verify the invariant: quantity of this card in the deck never exceeds 4
        const detail = deckRepo.findById(deck.id)
        if (!detail) return false

        const cardEntry = detail.cards.find((c) => c.card.id === 'card-copy-limit-1')
        const quantity = cardEntry?.quantity ?? 0

        return quantity <= 4
      }),
      { numRuns: 100 }
    )
  })
})
