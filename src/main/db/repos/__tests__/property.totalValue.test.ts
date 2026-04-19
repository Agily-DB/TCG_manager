// Feature: pokemon-tcg-manager, Property 3: Cálculo de valor total da coleção
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
import { userCollectionRepo } from '../userCollectionRepo'

// ─── Seed data ────────────────────────────────────────────────────────────────

const COLLECTIONS = [
  { id: 'col-a', name: 'Collection Alpha' },
  { id: 'col-b', name: 'Collection Beta' },
]

// 4 cards per collection (8 total)
const CARDS = COLLECTIONS.flatMap((col, ci) =>
  [0, 1, 2, 3].map((i) => ({
    id: `card-${ci}-${i}`,
    collectionId: col.id,
    name: `Card ${ci}-${i}`,
    number: `${String(ci * 4 + i + 1).padStart(3, '0')}`,
  }))
)

function seedAll() {
  for (const col of COLLECTIONS) {
    collectionRepo.upsert(col)
  }
  for (const card of CARDS) {
    cardRepo.upsert(card)
  }
}

// ─── Arbitrary ───────────────────────────────────────────────────────────────

/**
 * Generates an array of (cardIndex, price) pairs representing entries to add
 * and then price-update. Each card index is unique within a run to avoid
 * ambiguity in price assignment (last_price is per card_id row).
 */
const entriesWithPricesArb = fc.array(
  fc.record({
    cardIndex: fc.integer({ min: 0, max: CARDS.length - 1 }),
    price: fc.float({ min: 0, max: 1000, noNaN: true }),
  }),
  { minLength: 1, maxLength: CARDS.length }
).map((entries) => {
  // Deduplicate by cardIndex so each card appears at most once
  const seen = new Set<number>()
  return entries.filter(({ cardIndex }) => {
    if (seen.has(cardIndex)) return false
    seen.add(cardIndex)
    return true
  })
}).filter((entries) => entries.length > 0)

// ─── Property 3: Cálculo de valor total da coleção ───────────────────────────

/**
 * Validates: Requirements 1.3
 *
 * Para qualquer conjunto de user_collection_entries com last_price definido,
 * o campo totalValue no summary deve ser igual à soma de todos os last_price
 * das entradas daquela coleção.
 */
describe('Property 3: Cálculo de valor total da coleção', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedAll()
  })

  it('totalValue equals the sum of all last_price values for the collection', () => {
    fc.assert(
      fc.property(entriesWithPricesArb, (entries) => {
        // Reset DB for each property run
        testDb = createTestDb()
        seedAll()

        // Track expected total per collection
        const expectedTotalByCollection = new Map<string, number>()

        for (const { cardIndex, price } of entries) {
          const card = CARDS[cardIndex]
          userCollectionRepo.addOrIncrement(card.id)
          userCollectionRepo.updatePrice(card.id, price, '')

          const prev = expectedTotalByCollection.get(card.collectionId) ?? 0
          expectedTotalByCollection.set(card.collectionId, prev + price)
        }

        const summary = userCollectionRepo.findSummary()

        for (const s of summary) {
          const expected = expectedTotalByCollection.get(s.collection.id) ?? 0
          // Allow small floating-point tolerance
          if (Math.abs(s.totalValue - expected) > 0.0001) return false
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})
