// Feature: pokemon-tcg-manager, Property 17: Initial_Import persiste todas as coleções e cartas da API
import { describe, it, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import Database from 'better-sqlite3'
import { createTestDb } from '../../db/repos/__tests__/testDb'

// ─── Module mock setup ────────────────────────────────────────────────────────
let testDb: Database.Database

vi.mock('../../db/database', () => ({
  getDatabase: () => testDb,
  initDatabase: () => testDb,
}))

// Mock the PokemonTCG client — implementations are replaced per property run
vi.mock('../pokemonTCGClient', () => ({
  fetchAllSets: vi.fn(),
  fetchCardsForSet: vi.fn(),
}))

// Import after mocks are registered
import { collectionRepo } from '../../db/repos/collectionRepo'
import { cardRepo } from '../../db/repos/cardRepo'
import { runImport } from '../initialImporter'
import { fetchAllSets, fetchCardsForSet } from '../pokemonTCGClient'
import type { Collection, Card } from '../../../shared/types'

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** A single collection with a unique id based on index */
function makeCollection(i: number): Collection {
  return {
    id: `set-${i}`,
    name: `Set ${i}`,
    series: 'Test Series',
    total: 10,
    releaseDate: '2024/01/01',
  }
}

/** Cards for a given collection, M cards total */
function makeCards(collectionId: string, m: number): Card[] {
  return Array.from({ length: m }, (_, j) => ({
    id: `${collectionId}-card-${j}`,
    collectionId,
    name: `Card ${j}`,
    number: String(j + 1).padStart(3, '0'),
  }))
}

/**
 * Generates an array of (collection, cardCount) pairs.
 * N collections (0..5), each with M_i cards (0..10).
 */
const importScenarioArb = fc
  .integer({ min: 0, max: 5 })
  .chain((n) =>
    fc.tuple(
      fc.constant(n),
      fc.array(fc.integer({ min: 0, max: 10 }), { minLength: n, maxLength: n })
    )
  )

// ─── Fake BrowserWindow ───────────────────────────────────────────────────────

const fakeWin = {
  webContents: {
    send: vi.fn(),
  },
} as unknown as import('electron').BrowserWindow

// ─── Property 17 ─────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 9.2, 9.3
 *
 * Para qualquer resposta mockada com N coleções e M_i cartas cada,
 * após executar o importer o banco deve conter exatamente N coleções
 * e sum(M_i) cartas.
 */
describe('Property 17: Initial_Import persiste todas as coleções e cartas', () => {
  beforeEach(() => {
    testDb = createTestDb()
    vi.clearAllMocks()
  })

  it('DB contains exactly N collections and sum(M_i) cards after import', async () => {
    await fc.assert(
      fc.asyncProperty(importScenarioArb, async ([n, cardCounts]) => {
        // Fresh DB and mocks for each run
        testDb = createTestDb()
        vi.clearAllMocks()

        const collections = Array.from({ length: n }, (_, i) => makeCollection(i))
        const cardsBySet = collections.map((col, i) => makeCards(col.id, cardCounts[i]))

        // Wire up mocks
        vi.mocked(fetchAllSets).mockResolvedValue(collections)
        vi.mocked(fetchCardsForSet).mockImplementation(async (setId: string) => {
          const idx = collections.findIndex((c) => c.id === setId)
          return idx >= 0 ? cardsBySet[idx] : []
        })

        await runImport(fakeWin)

        // Verify collections
        const storedCollections = collectionRepo.findAll()
        if (storedCollections.length !== n) return false

        // Verify cards
        const totalExpectedCards = cardCounts.reduce((sum, m) => sum + m, 0)
        const storedCards = cardRepo.findByFilter({})
        if (storedCards.length !== totalExpectedCards) return false

        // Verify each collection's cards individually
        for (let i = 0; i < n; i++) {
          const col = collections[i]
          const colCards = cardRepo.findByFilter({ collectionId: col.id })
          if (colCards.length !== cardCounts[i]) return false
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})
