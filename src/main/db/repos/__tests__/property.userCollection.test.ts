// Feature: pokemon-tcg-manager, Property 8: Adição de carta à User_Collection incrementa quantidade
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
import { purchaseRepo } from '../purchaseRepo'
import { productUnitRepo } from '../productUnitRepo'
import { userCollectionRepo } from '../userCollectionRepo'

// ─── Seed helpers ─────────────────────────────────────────────────────────────
const SEED_COLLECTION_ID = 'col-seed-uc'
const SEED_CARD_ID = 'card-seed-uc'

function seedData() {
  collectionRepo.upsert({ id: SEED_COLLECTION_ID, name: 'Test Collection' })
  cardRepo.upsert({
    id: SEED_CARD_ID,
    collectionId: SEED_COLLECTION_ID,
    name: 'Pikachu',
    number: '025',
  })
}

/** Creates a real product_unit in the DB and returns its id */
function seedProductUnit(): string {
  const purchase = purchaseRepo.create({
    productType: 'Booster',
    collectionId: SEED_COLLECTION_ID,
    quantity: 1,
    unitPrice: 5.0,
    purchasedAt: new Date().toISOString(),
  })
  const [unit] = productUnitRepo.create(purchase.id, 1)
  return unit.id
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const addCountArb = fc.integer({ min: 1, max: 20 })

// ─── Property 8: Adição de carta incrementa quantidade ───────────────────────

/**
 * Validates: Requirements 3.3
 *
 * Para qualquer carta adicionada N vezes via addOrIncrement, a quantity
 * resultante é igual a N, registeredAt está presente e não-nulo, e
 * productUnitId é armazenado quando fornecido.
 */
describe('Property 8: Adição de carta à User_Collection incrementa quantidade', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedData()
  })

  it('quantity equals N after N calls to addOrIncrement', () => {
    fc.assert(
      fc.property(addCountArb, (n) => {
        // Reset DB for each property run
        testDb = createTestDb()
        seedData()

        for (let i = 0; i < n; i++) {
          userCollectionRepo.addOrIncrement(SEED_CARD_ID)
        }

        const row = testDb
          .prepare('SELECT * FROM user_collection_entries WHERE card_id = ?')
          .get(SEED_CARD_ID) as Record<string, unknown> | undefined

        if (!row) return false

        // quantity must equal N
        if (row.quantity !== n) return false

        // registeredAt must be present and non-null
        if (!row.registered_at || typeof row.registered_at !== 'string') return false

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('productUnitId is stored when provided on first insertion', () => {
    fc.assert(
      fc.property(fc.boolean(), (_unused) => {
        // Reset DB for each property run and seed a real product unit
        testDb = createTestDb()
        seedData()
        const productUnitId = seedProductUnit()

        userCollectionRepo.addOrIncrement(SEED_CARD_ID, productUnitId)

        const row = testDb
          .prepare('SELECT * FROM user_collection_entries WHERE card_id = ?')
          .get(SEED_CARD_ID) as Record<string, unknown> | undefined

        if (!row) return false

        // productUnitId must be stored
        if (row.product_unit_id !== productUnitId) return false

        // registeredAt must be present
        if (!row.registered_at || typeof row.registered_at !== 'string') return false

        return true
      }),
      { numRuns: 100 }
    )
  })
})
