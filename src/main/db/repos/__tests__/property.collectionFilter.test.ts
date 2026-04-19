// Feature: pokemon-tcg-manager, Property 10: Filtro por Collection retorna apenas cartas da coleção
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

/** Generate 2 or 3 distinct collection ids */
const collectionCountArb = fc.integer({ min: 2, max: 3 })

/** Generate a number of cards per collection (0..15) */
const cardsPerCollectionArb = fc.integer({ min: 0, max: 15 })

// ─── Property 10: Filtro por Collection retorna apenas cartas da coleção ──────

/**
 * Validates: Requirements 4.5
 *
 * Para qualquer conjunto de cartas distribuídas entre 2-3 coleções e qualquer
 * collectionId escolhido como filtro, `cardRepo.findByFilter({ collectionId })`
 * deve retornar APENAS cartas cujo `collectionId` corresponde ao filtro —
 * nenhuma carta de outra coleção deve aparecer no resultado.
 */
describe('Property 10: Filtro por Collection retorna apenas cartas da coleção', () => {
  beforeEach(() => {
    testDb = createTestDb()
  })

  it('getCards({ collectionId }) returns only cards from the specified collection', () => {
    fc.assert(
      fc.property(
        collectionCountArb,
        fc.array(cardsPerCollectionArb, { minLength: 2, maxLength: 3 }),
        fc.integer({ min: 0, max: 2 }),
        (collectionCount, cardsPerCol, filterIndex) => {
          // Reset DB for each property run
          testDb = createTestDb()

          const numCollections = collectionCount
          const filterColIndex = filterIndex % numCollections

          // Create collections
          const collectionIds = Array.from(
            { length: numCollections },
            (_, i) => `col-filter-${i}`
          )
          for (const colId of collectionIds) {
            collectionRepo.upsert({ id: colId, name: `Collection ${colId}` })
          }

          // Insert cards across collections
          let cardCounter = 0
          const cardsByCollection: Map<string, string[]> = new Map()

          for (let ci = 0; ci < numCollections; ci++) {
            const colId = collectionIds[ci]
            const count = cardsPerCol[ci] ?? 0
            const ids: string[] = []

            for (let j = 0; j < count; j++) {
              const cardId = `card-cf-${cardCounter++}`
              cardRepo.upsert({
                id: cardId,
                collectionId: colId,
                name: `Card ${cardId}`,
                number: String(j + 1).padStart(3, '0'),
              })
              ids.push(cardId)
            }

            cardsByCollection.set(colId, ids)
          }

          // Pick the collection to filter by
          const targetColId = collectionIds[filterColIndex]
          const expectedIds = new Set(cardsByCollection.get(targetColId) ?? [])

          // Query with collectionId filter
          const result = cardRepo.findByFilter({ collectionId: targetColId })
          const returnedIds = new Set(result.map((c) => c.id))

          // Every returned card must belong to the target collection
          for (const card of result) {
            if (card.collectionId !== targetColId) return false
          }

          // The count must match exactly
          if (returnedIds.size !== expectedIds.size) return false

          // Every expected card must be present
          for (const id of expectedIds) {
            if (!returnedIds.has(id)) return false
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
