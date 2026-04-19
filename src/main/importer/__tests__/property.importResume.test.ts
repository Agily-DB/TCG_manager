// Feature: pokemon-tcg-manager, Property 18: Retomada de import parcial começa do ponto correto
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

vi.mock('../pokemonTCGClient', () => ({
  fetchAllSets: vi.fn(),
  fetchCardsForSet: vi.fn(),
}))

// Import after mocks are registered
import { collectionRepo } from '../../db/repos/collectionRepo'
import { runImport } from '../initialImporter'
import { fetchAllSets, fetchCardsForSet } from '../pokemonTCGClient'
import type { Collection, Card } from '../../../shared/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCollection(i: number): Collection {
  return {
    id: `set-${i}`,
    name: `Set ${i}`,
    series: 'Test Series',
    total: 5,
    releaseDate: '2024/01/01',
  }
}

function makeCards(collectionId: string): Card[] {
  return Array.from({ length: 3 }, (_, j) => ({
    id: `${collectionId}-card-${j}`,
    collectionId,
    name: `Card ${j}`,
    number: String(j + 1).padStart(3, '0'),
  }))
}

/** Query the last sync_log entry regardless of status */
function getLastSyncEntry(): { lastCollectionIndex: number; status: string } | null {
  const row = testDb
    .prepare('SELECT last_collection_index, status FROM sync_log ORDER BY id DESC LIMIT 1')
    .get() as { last_collection_index: number; status: string } | undefined
  return row ? { lastCollectionIndex: row.last_collection_index, status: row.status } : null
}

// ─── Fake BrowserWindow ───────────────────────────────────────────────────────

const fakeWin = {
  webContents: { send: vi.fn() },
} as unknown as import('electron').BrowserWindow

// ─── Arbitrary ───────────────────────────────────────────────────────────────

/**
 * Generates (N, K) where N >= 2 is total collections and 0 <= K < N is the
 * failure point: fetchCardsForSet throws on the K-th call (0-indexed).
 * K successful calls means collections 0..K-1 were fully processed.
 */
const resumeScenarioArb = fc
  .integer({ min: 2, max: 8 })
  .chain((n) =>
    fc.tuple(
      fc.constant(n),
      fc.integer({ min: 0, max: n - 1 })
    )
  )

// ─── Property 18 ─────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 9.9
 *
 * Para qualquer import que falha após K coleções completadas (de N total):
 * 1. O sync_log registra last_collection_index = K-1 (último índice bem-sucedido),
 *    ou 0 se K=0 (nenhuma coleção foi completada — valor inicial).
 * 2. Ao retomar, o importer começa do índice last_collection_index (não reimporta
 *    coleções anteriores a esse ponto).
 *
 * Comportamento do initialImporter:
 * - Após processar coleção i com sucesso: updateEntry({ lastCollectionIndex: i })
 * - Se fetchCardsForSet(i) lança: lastCollectionIndex permanece em i-1 (ou 0 se i=0)
 * - Resume: startIndex = lastRunning.lastCollectionIndex → loop começa em startIndex
 * - Após falha: status = 'failed' (não 'running'), então getLastRunning() retorna null
 *   e o resume usa resumeFromIndex explícito ou começa do zero
 */
describe('Property 18: Retomada de import parcial começa do ponto correto', () => {
  beforeEach(() => {
    testDb = createTestDb()
    vi.clearAllMocks()
  })

  it('sync_log records last_collection_index = K-1 and resume only imports from that index onward', async () => {
    await fc.assert(
      fc.asyncProperty(resumeScenarioArb, async ([n, k]) => {
        // Fresh DB and mocks for each run
        testDb = createTestDb()
        vi.clearAllMocks()

        const collections = Array.from({ length: n }, (_, i) => makeCollection(i))

        // ── Phase 1: initial import that fails at fetchCardsForSet call #K ──
        // K successful calls → collections 0..K-1 fully processed
        // Call #K (index K) throws
        let callCount = 0
        vi.mocked(fetchAllSets).mockResolvedValue(collections)
        vi.mocked(fetchCardsForSet).mockImplementation(async (setId: string) => {
          if (callCount >= k) {
            callCount++
            throw new Error(`Simulated failure at call ${k}`)
          }
          callCount++
          return makeCards(setId)
        })

        try {
          await runImport(fakeWin)
        } catch {
          // Expected failure
        }

        // Verify sync_log has a failed entry with correct last_collection_index
        const failedEntry = getLastSyncEntry()
        if (!failedEntry) return false
        if (failedEntry.status !== 'failed') return false

        // last_collection_index should be K-1 (last fully processed index)
        // When K=0: no collection was fully processed, stays at 0 (initial value from createEntry)
        // When K>0: last fully processed index is K-1
        const expectedLastIndex = k === 0 ? 0 : k - 1
        if (failedEntry.lastCollectionIndex !== expectedLastIndex) return false

        // ── Phase 2: resume — pass the resume index explicitly ────────────
        // The resume starts at lastCollectionIndex (re-does that index since it
        // may have been partially processed — collection upserted but cards failed)
        const resumeStartIndex = failedEntry.lastCollectionIndex

        const fetchedDuringResume: string[] = []
        vi.mocked(fetchCardsForSet).mockImplementation(async (setId: string) => {
          fetchedDuringResume.push(setId)
          return makeCards(setId)
        })

        // Pass resumeFromIndex explicitly to simulate the resume flow
        await runImport(fakeWin, resumeStartIndex)

        // Sets before resumeStartIndex must NOT have been fetched during resume
        const setsBeforeResume = collections.slice(0, resumeStartIndex).map((c) => c.id)
        for (const setId of setsBeforeResume) {
          if (fetchedDuringResume.includes(setId)) return false
        }

        // Sets from resumeStartIndex onward must all have been fetched during resume
        const expectedResumeSets = collections.slice(resumeStartIndex).map((c) => c.id)
        for (const setId of expectedResumeSets) {
          if (!fetchedDuringResume.includes(setId)) return false
        }

        // After resume, all N collections should be in the DB
        const storedCollections = collectionRepo.findAll()
        if (storedCollections.length !== n) return false

        return true
      }),
      { numRuns: 100 }
    )
  })
})
