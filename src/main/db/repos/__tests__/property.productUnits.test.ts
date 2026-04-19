// Feature: pokemon-tcg-manager, Property 6: Criação de N Product_Units ao registrar Purchase
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
import { productUnitRepo } from '../productUnitRepo'

// ─── Seed helpers ─────────────────────────────────────────────────────────────
const SEED_COLLECTION_ID = 'col-seed-1'

function seedCollection() {
  collectionRepo.upsert({ id: SEED_COLLECTION_ID, name: 'Test Collection' })
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const quantityArb = fc.integer({ min: 1, max: 50 })

const createPurchaseDTOArb = fc.record({
  productType: fc.constantFrom('Booster', 'Blister', 'ETB', 'Booster_Box', 'Tin', 'Starter_Deck', 'Bundle'),
  collectionId: fc.constant(SEED_COLLECTION_ID),
  quantity: quantityArb,
  unitPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99), noNaN: true, noDefaultInfinity: true })
    .map((v) => Math.round(v * 100) / 100),
  purchasedAt: fc
    .date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
    .map((d) => d.toISOString()),
})

// ─── Property 6: N Product_Units criados por Purchase ────────────────────────

/**
 * Validates: Requirements 2.4
 *
 * Para qualquer quantidade N > 0, após criar uma Purchase com quantity=N e
 * chamar productUnitRepo.create(purchase.id, N), devem existir exatamente N
 * product_units com opening_status='Pending' e todos com IDs distintos.
 */
describe('Property 6: N Product_Units criados por Purchase', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedCollection()
  })

  it('cria exatamente N units com status Pending e IDs distintos', () => {
    fc.assert(
      fc.property(createPurchaseDTOArb, (dto) => {
        const purchase = purchaseRepo.create(dto)
        const units = productUnitRepo.create(purchase.id, dto.quantity)

        // Deve retornar exatamente N units
        if (units.length !== dto.quantity) return false

        // Todos devem ter opening_status 'Pending'
        if (!units.every((u) => u.openingStatus === 'Pending')) return false

        // Todos devem estar vinculados ao purchase correto
        if (!units.every((u) => u.purchaseId === purchase.id)) return false

        // Todos os IDs devem ser distintos
        const ids = units.map((u) => u.id)
        const uniqueIds = new Set(ids)
        if (uniqueIds.size !== dto.quantity) return false

        // Verificar também via findByPurchaseId (persistência real)
        const persisted = productUnitRepo.findByPurchaseId(purchase.id)
        if (persisted.length !== dto.quantity) return false
        if (!persisted.every((u) => u.openingStatus === 'Pending')) return false

        const persistedIds = new Set(persisted.map((u) => u.id))
        if (persistedIds.size !== dto.quantity) return false

        return true
      }),
      { numRuns: 100 }
    )
  })
})
