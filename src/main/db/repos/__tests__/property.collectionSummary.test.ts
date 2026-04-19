// Feature: pokemon-tcg-manager, Property 1: Collection Summary retorna exatamente as coleções com cartas
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

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generates a set of (collectionIndex, cardIndex) pairs representing entries
 * to add to the user collection. collectionIndex and cardIndex are small
 * integers used to index into pre-seeded collections/cards arrays.
 */
const entriesArb = fc.array(
  fc.record({
    collectionIndex: fc.integer({ min: 0, max: 2 }),
    cardIndex: fc.integer({ min: 0, max: 2 }),
  }),
  { minLength: 0, maxLength: 20 }
)

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const COLLECTIONS = [
  { id: 'col-a', name: 'Collection Alpha' },
  { id: 'col-b', name: 'Collection Beta' },
  { id: 'col-c', name: 'Collection Gamma' },
]

// 3 cards per collection (9 total)
const CARDS = COLLECTIONS.flatMap((col, ci) =>
  [0, 1, 2].map((i) => ({
    id: `card-${ci}-${i}`,
    collectionId: col.id,
    name: `Card ${ci}-${i}`,
    number: `${String(ci * 3 + i + 1).padStart(3, '0')}`,
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

/**
 * Returns the card id for a given (collectionIndex, cardIndex) pair.
 * cardIndex is clamped to [0, 2].
 */
function resolveCardId(collectionIndex: number, cardIndex: number): string {
  const ci = collectionIndex % COLLECTIONS.length
  const ki = cardIndex % 3
  return `card-${ci}-${ki}`
}

// ─── Property 1: Collection Summary retorna exatamente as coleções com cartas ─

/**
 * Validates: Requirements 1.1, 1.4
 *
 * Para qualquer conjunto de user_collection_entries distribuídas entre
 * múltiplas coleções, userCollectionRepo.findSummary() retorna APENAS as
 * coleções que possuem ao menos uma entrada, e cada resultado contém
 * collection.name, distinctCardCount > 0 e totalValue >= 0.
 */
describe('Property 1: Collection Summary retorna exatamente as coleções com cartas', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedAll()
  })

  it('returns only collections with at least one entry, with complete fields', () => {
    fc.assert(
      fc.property(entriesArb, (entries) => {
        // Reset DB for each property run
        testDb = createTestDb()
        seedAll()

        // Determine which collections will have entries
        const collectionsWithEntries = new Set<string>()
        for (const { collectionIndex, cardIndex } of entries) {
          const cardId = resolveCardId(collectionIndex, cardIndex)
          userCollectionRepo.addOrIncrement(cardId)
          collectionsWithEntries.add(COLLECTIONS[collectionIndex % COLLECTIONS.length].id)
        }

        const summary = userCollectionRepo.findSummary()

        // The set of returned collection ids must equal the set of collections
        // that actually received entries
        const returnedIds = new Set(summary.map((s) => s.collection.id))

        if (returnedIds.size !== collectionsWithEntries.size) return false
        for (const id of collectionsWithEntries) {
          if (!returnedIds.has(id)) return false
        }

        // Each summary entry must have complete fields and valid values
        for (const s of summary) {
          // collection.name must be a non-empty string
          if (!s.collection.name || typeof s.collection.name !== 'string') return false

          // distinctCardCount must be > 0
          if (s.distinctCardCount <= 0) return false

          // totalValue must be >= 0
          if (s.totalValue < 0) return false
        }

        // Collections with no entries must NOT appear in the summary
        const allCollectionIds = COLLECTIONS.map((c) => c.id)
        for (const id of allCollectionIds) {
          const inSummary = returnedIds.has(id)
          const hasEntries = collectionsWithEntries.has(id)
          if (inSummary !== hasEntries) return false
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})
