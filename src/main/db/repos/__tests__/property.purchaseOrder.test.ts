// Feature: pokemon-tcg-manager, Property 7: Histórico de Purchases ordenado por data decrescente
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
import { purchaseRepo } from '../purchaseRepo'
import { collectionRepo } from '../collectionRepo'

// ─── Seed helpers ─────────────────────────────────────────────────────────────
const SEED_COLLECTION_ID = 'col-seed-order-1'

function seedCollection() {
  collectionRepo.upsert({ id: SEED_COLLECTION_ID, name: 'Test Collection Order' })
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const purchasedAtArb = fc
  .date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
  .map((d) => d.toISOString())

const singlePurchaseDTOArb = fc.record({
  productType: fc.constantFrom('Booster', 'Blister', 'ETB', 'Booster_Box', 'Tin', 'Starter_Deck', 'Bundle'),
  collectionId: fc.constant(SEED_COLLECTION_ID),
  quantity: fc.integer({ min: 1, max: 100 }),
  unitPrice: fc.float({ min: 0, max: 9999, noNaN: true, noDefaultInfinity: true }).map(
    (v) => Math.round(v * 100) / 100
  ),
  purchasedAt: purchasedAtArb,
})

// Array of 1–20 purchases with random dates
const purchaseListArb = fc.array(singlePurchaseDTOArb, { minLength: 1, maxLength: 20 })

// ─── Property 7: Histórico de Purchases ordenado por data decrescente ─────────

/**
 * Validates: Requirements 2.7
 *
 * Para qualquer conjunto de purchases com datas aleatórias, `findAll()` retorna
 * a lista ordenada de forma que `purchases[i].purchasedAt >= purchases[i+1].purchasedAt`.
 */
describe('Property 7: Histórico de Purchases ordenado por data decrescente', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedCollection()
  })

  it('findAll retorna purchases ordenadas por purchasedAt decrescente', () => {
    fc.assert(
      fc.property(purchaseListArb, (dtos) => {
        // Insert all purchases
        for (const dto of dtos) {
          purchaseRepo.create(dto)
        }

        const purchases = purchaseRepo.findAll()

        // Must have at least as many as we inserted
        if (purchases.length < dtos.length) return false

        // Verify descending order invariant: purchases[i].purchasedAt >= purchases[i+1].purchasedAt
        for (let i = 0; i < purchases.length - 1; i++) {
          if (purchases[i].purchasedAt < purchases[i + 1].purchasedAt) return false
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})
