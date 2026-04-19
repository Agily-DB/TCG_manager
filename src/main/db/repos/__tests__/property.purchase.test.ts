// Feature: pokemon-tcg-manager, Property 5: Round-trip de criação de Purchase
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
const SEED_COLLECTION_ID = 'col-seed-1'

function seedCollection() {
  collectionRepo.upsert({ id: SEED_COLLECTION_ID, name: 'Test Collection' })
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const productTypeArb = fc.oneof(
  fc.constantFrom('Booster', 'Blister', 'ETB', 'Booster_Box', 'Tin', 'Starter_Deck', 'Bundle'),
  fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0)
)

const quantityArb = fc.integer({ min: 1, max: 100 })

const unitPriceArb = fc.float({ min: 0, max: 9999, noNaN: true, noDefaultInfinity: true }).map(
  (v) => Math.round(v * 100) / 100
)

const purchasedAtArb = fc
  .date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
  .map((d) => d.toISOString())

const createPurchaseDTOArb = fc.record({
  productType: productTypeArb,
  collectionId: fc.constant(SEED_COLLECTION_ID),
  quantity: quantityArb,
  unitPrice: unitPriceArb,
  purchasedAt: purchasedAtArb,
})

// ─── Property 5: Round-trip de Purchase ──────────────────────────────────────

/**
 * Validates: Requirements 2.1
 *
 * Para qualquer Purchase válida, `create` seguido de `findById` deve retornar
 * os mesmos valores que foram fornecidos na criação.
 */
describe('Property 5: Round-trip de criação de Purchase', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedCollection()
  })

  it('create seguido de findById retorna os mesmos valores', () => {
    fc.assert(
      fc.property(createPurchaseDTOArb, (dto) => {
        const created = purchaseRepo.create(dto)

        // id deve ser gerado e não vazio
        if (!created.id || created.id.length === 0) return false

        const detail = purchaseRepo.findById(created.id)

        // deve existir
        if (!detail) return false

        // todos os campos devem bater com o DTO original
        return (
          detail.id === created.id &&
          detail.productType === dto.productType &&
          detail.collectionId === dto.collectionId &&
          detail.quantity === dto.quantity &&
          detail.unitPrice === dto.unitPrice &&
          detail.purchasedAt === dto.purchasedAt
        )
      }),
      { numRuns: 100 }
    )
  })
})
