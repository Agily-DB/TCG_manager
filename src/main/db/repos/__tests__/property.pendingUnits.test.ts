// Feature: pokemon-tcg-manager, Property 4: Filtragem de Product_Units pendentes
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
const SEED_COLLECTION_ID = 'col-seed-pending'

function seedCollection() {
  collectionRepo.upsert({ id: SEED_COLLECTION_ID, name: 'Test Collection Pending' })
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const openingStatusArb = fc.constantFrom('Pending', 'In_Progress', 'Completed' as const)

// Array of statuses with at least 1 element, max 20
const statusArrayArb = fc.array(openingStatusArb, { minLength: 1, maxLength: 20 })

// ─── Property 4: Filtragem de Product_Units pendentes ────────────────────────

/**
 * Validates: Requirements 1.6, 1.7
 *
 * Para qualquer conjunto de product_units com statuses aleatórios
 * (Pending, In_Progress, Completed), productUnitRepo.findPending() deve
 * retornar APENAS units com status Pending ou In_Progress, e cada resultado
 * deve ter os campos id, purchaseId e openingStatus presentes.
 */
describe('Property 4: Filtragem de Product_Units pendentes', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedCollection()
  })

  it('findPending retorna somente units Pending ou In_Progress com campos obrigatórios', () => {
    fc.assert(
      fc.property(statusArrayArb, (statuses) => {
        // Create a purchase to attach units to
        const purchase = purchaseRepo.create({
          productType: 'Booster',
          collectionId: SEED_COLLECTION_ID,
          quantity: statuses.length,
          unitPrice: 10.0,
          purchasedAt: new Date('2024-01-01').toISOString(),
        })

        // Create N units (all start as Pending), then update each to the desired status
        const units = productUnitRepo.create(purchase.id, statuses.length)
        statuses.forEach((status, i) => {
          if (status !== 'Pending') {
            productUnitRepo.updateStatus(units[i].id, status)
          }
        })

        // Call findPending
        const pending = productUnitRepo.findPending()

        // Count how many units in this batch should be pending
        const expectedPendingIds = new Set(
          units
            .filter((_, i) => statuses[i] === 'Pending' || statuses[i] === 'In_Progress')
            .map((u) => u.id)
        )

        // All returned units must have status Pending or In_Progress
        const allPendingOrInProgress = pending.every(
          (u) => u.openingStatus === 'Pending' || u.openingStatus === 'In_Progress'
        )
        if (!allPendingOrInProgress) return false

        // All expected pending units from this batch must be present in results
        const returnedIds = new Set(pending.map((u) => u.id))
        for (const id of expectedPendingIds) {
          if (!returnedIds.has(id)) return false
        }

        // No Completed units from this batch should appear
        const completedIds = new Set(
          units
            .filter((_, i) => statuses[i] === 'Completed')
            .map((u) => u.id)
        )
        for (const id of completedIds) {
          if (returnedIds.has(id)) return false
        }

        // Each result must have required fields: id, purchaseId, openingStatus
        const allHaveRequiredFields = pending.every(
          (u) =>
            typeof u.id === 'string' && u.id.length > 0 &&
            typeof u.purchaseId === 'string' && u.purchaseId.length > 0 &&
            typeof u.openingStatus === 'string' && u.openingStatus.length > 0
        )
        if (!allHaveRequiredFields) return false

        return true
      }),
      { numRuns: 100 }
    )
  })
})
