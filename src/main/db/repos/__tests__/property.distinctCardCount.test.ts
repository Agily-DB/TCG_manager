// Feature: pokemon-tcg-manager, Property 2: Contagem de cartas distintas por coleção
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
 * Generates an array of card indices (0..7) with possible repeats,
 * simulating multiple addOrIncrement calls including duplicates.
 */
const cardIndicesArb = fc.array(
  fc.integer({ min: 0, max: CARDS.length - 1 }),
  { minLength: 0, maxLength: 30 }
)

// ─── Property 2: Contagem de cartas distintas por coleção ─────────────────────

/**
 * Validates: Requirements 1.2
 *
 * Para qualquer sequência de chamadas addOrIncrement (incluindo duplicatas do
 * mesmo card_id), o campo distinctCardCount no summary deve ser igual ao número
 * de card_ids únicos adicionados — não ao total de chamadas.
 */
describe('Property 2: Contagem de cartas distintas por coleção', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedAll()
  })

  it('distinctCardCount equals the number of unique card_ids, not total calls', () => {
    fc.assert(
      fc.property(cardIndicesArb, (indices) => {
        // Reset DB for each property run
        testDb = createTestDb()
        seedAll()

        // Track unique card_ids per collection
        const uniqueCardsByCollection = new Map<string, Set<string>>()

        for (const idx of indices) {
          const card = CARDS[idx]
          userCollectionRepo.addOrIncrement(card.id)

          if (!uniqueCardsByCollection.has(card.collectionId)) {
            uniqueCardsByCollection.set(card.collectionId, new Set())
          }
          uniqueCardsByCollection.get(card.collectionId)!.add(card.id)
        }

        const summary = userCollectionRepo.findSummary()

        // For each collection that has entries, verify distinctCardCount
        for (const s of summary) {
          const expectedDistinct = uniqueCardsByCollection.get(s.collection.id)?.size ?? 0
          if (s.distinctCardCount !== expectedDistinct) return false
        }

        // Also verify collections with entries appear in summary
        for (const [colId, cards] of uniqueCardsByCollection) {
          if (cards.size === 0) continue
          const entry = summary.find((s) => s.collection.id === colId)
          if (!entry) return false
          if (entry.distinctCardCount !== cards.size) return false
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})
