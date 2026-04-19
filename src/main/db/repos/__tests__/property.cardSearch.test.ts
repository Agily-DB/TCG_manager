// Feature: pokemon-tcg-manager, Property 11: Busca por nome ou número retorna apenas cartas correspondentes
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

// ─── Fixed card set ───────────────────────────────────────────────────────────

const COLLECTION_ID = 'col-search-test'

const FIXED_CARDS = [
  { id: 'card-001', name: 'Pikachu', number: '025' },
  { id: 'card-002', name: 'Charizard', number: '006' },
  { id: 'card-003', name: 'Bulbasaur', number: '001' },
  { id: 'card-004', name: 'Squirtle', number: '007' },
  { id: 'card-005', name: 'Mewtwo', number: '150' },
  { id: 'card-006', name: 'Gengar', number: '094' },
  { id: 'card-007', name: 'Eevee', number: '133' },
  { id: 'card-008', name: 'Snorlax', number: '143' },
  { id: 'card-009', name: 'Jigglypuff', number: '039' },
  { id: 'card-010', name: 'Alakazam', number: '065' },
]

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/**
 * Generates non-empty search query strings.
 * We use printable ASCII characters to keep queries realistic.
 */
const nonEmptyQueryArb = fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0)

// ─── Property 11: Busca por nome ou número retorna apenas cartas correspondentes ──

/**
 * **Validates: Requirements 4.6**
 *
 * Para qualquer query de busca não-vazia, `cardRepo.findByFilter({ search: query })`
 * deve retornar APENAS cartas cujo `name` ou `number` contém a query (case-insensitive),
 * e nenhuma carta que não corresponda ao critério.
 */
describe('Property 11: Busca por nome ou número retorna apenas cartas correspondentes', () => {
  beforeEach(() => {
    testDb = createTestDb()
    collectionRepo.upsert({ id: COLLECTION_ID, name: 'Search Test Collection' })
    for (const card of FIXED_CARDS) {
      cardRepo.upsert({ id: card.id, collectionId: COLLECTION_ID, name: card.name, number: card.number })
    }
  })

  it('findByFilter({ search }) returns only cards matching name or number (case-insensitive)', () => {
    fc.assert(
      fc.property(nonEmptyQueryArb, (query) => {
        const results = cardRepo.findByFilter({ search: query })
        const lowerQuery = query.toLowerCase()

        // Every returned card must match the query in name or number
        for (const card of results) {
          const matchesName = card.name.toLowerCase().includes(lowerQuery)
          const matchesNumber = card.number.toLowerCase().includes(lowerQuery)
          if (!matchesName && !matchesNumber) return false
        }

        // Every card that should match must be in the results
        const expectedIds = new Set(
          FIXED_CARDS
            .filter(
              (c) =>
                c.name.toLowerCase().includes(lowerQuery) ||
                c.number.toLowerCase().includes(lowerQuery)
            )
            .map((c) => c.id)
        )
        const returnedIds = new Set(results.map((c) => c.id))

        for (const id of expectedIds) {
          if (!returnedIds.has(id)) return false
        }

        // No extra cards beyond what matches
        if (results.length !== expectedIds.size) return false

        return true
      }),
      { numRuns: 100 }
    )
  })
})
