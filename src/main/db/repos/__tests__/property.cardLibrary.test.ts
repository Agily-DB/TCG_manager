// Feature: pokemon-tcg-manager, Property 9: Card_Library retorna todas as cartas da User_Collection
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

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generates a unique card id from an index.
 */
function cardId(i: number): string {
  return `card-lib-${i}`
}

/**
 * Generates a set of card indices to insert (0..N-1), no duplicates.
 * We use a set size between 0 and 30.
 */
const cardSetArb = fc
  .integer({ min: 0, max: 30 })
  .chain((n) =>
    fc.constant(Array.from({ length: n }, (_, i) => i))
  )

// ─── Property 9: Card_Library retorna todas as cartas da User_Collection ──────

/**
 * Validates: Requirements 4.1
 *
 * Para qualquer conjunto de cartas inseridas na tabela `cards`,
 * `cardRepo.findByFilter({})` (sem filtros) deve retornar todas elas
 * sem omissões — o conjunto de IDs retornados deve ser igual ao conjunto
 * de IDs inseridos.
 */
describe('Property 9: Card_Library retorna todas as cartas da User_Collection', () => {
  const COLLECTION_ID = 'col-card-lib'

  beforeEach(() => {
    testDb = createTestDb()
    collectionRepo.upsert({ id: COLLECTION_ID, name: 'Card Library Collection' })
  })

  it('getCards({}) returns all inserted cards without omissions', () => {
    fc.assert(
      fc.property(cardSetArb, (indices) => {
        // Reset DB for each property run
        testDb = createTestDb()
        collectionRepo.upsert({ id: COLLECTION_ID, name: 'Card Library Collection' })

        // Insert all cards
        for (const i of indices) {
          cardRepo.upsert({
            id: cardId(i),
            collectionId: COLLECTION_ID,
            name: `Card ${i}`,
            number: String(i + 1).padStart(3, '0'),
          })
        }

        // Query with no filters
        const result = cardRepo.findByFilter({})

        // The result must contain exactly the inserted cards (by id)
        const insertedIds = new Set(indices.map(cardId))
        const returnedIds = new Set(result.map((c) => c.id))

        // Every inserted id must appear in the result
        for (const id of insertedIds) {
          if (!returnedIds.has(id)) return false
        }

        // The total count must match (no extra cards since DB is fresh)
        if (result.length !== indices.length) return false

        return true
      }),
      { numRuns: 100 }
    )
  })
})
