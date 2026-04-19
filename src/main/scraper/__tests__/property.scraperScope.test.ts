// Feature: pokemon-tcg-manager, Property 13: Atualização de preços respeita escopo da User_Collection
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

// Import repos AFTER the mock is registered
import { collectionRepo } from '../../db/repos/collectionRepo'
import { cardRepo } from '../../db/repos/cardRepo'
import { userCollectionRepo } from '../../db/repos/userCollectionRepo'
import type { PriceData } from '../priceScraper'

// ─── Seed data ────────────────────────────────────────────────────────────────

const COLLECTION_ID = 'col-scraper-scope'

// 10 cards available in the "library"
const ALL_CARDS = Array.from({ length: 10 }, (_, i) => ({
  id: `card-scope-${i}`,
  collectionId: COLLECTION_ID,
  name: `Card ${i}`,
  number: String(i + 1).padStart(3, '0'),
}))

function seedAll() {
  collectionRepo.upsert({ id: COLLECTION_ID, name: 'Scope Test Collection' })
  for (const card of ALL_CARDS) {
    cardRepo.upsert(card)
  }
}

// ─── Price update logic (extracted from scrapeHandler.ts) ─────────────────────

/**
 * Applies price updates to the user collection, mirroring the logic in
 * scrapeHandler.ts: only cards already in the User_Collection are updated.
 */
function applyPriceUpdates(collectionId: string, priceDataList: PriceData[]): number {
  const entries = userCollectionRepo.findByCollection(collectionId)
  let updated = 0
  for (const priceData of priceDataList) {
    const match = entries.find((e) => e.card.number === priceData.cardNumber)
    if (match) {
      userCollectionRepo.updatePrice(match.cardId, priceData.minPrice, priceData.buyLink)
      updated++
    }
  }
  return updated
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

// Subset of card indices that are in the User_Collection (0..9)
const userCollectionSubsetArb = fc
  .array(fc.integer({ min: 0, max: 9 }), { minLength: 0, maxLength: 10 })
  .map((indices) => [...new Set(indices)]) // deduplicate

// PriceData for any subset of the 10 cards (may include cards not in User_Collection)
const priceDataListArb = fc
  .array(fc.integer({ min: 0, max: 9 }), { minLength: 0, maxLength: 10 })
  .map((indices) => [...new Set(indices)])
  .chain((indices) =>
    fc.tuple(
      ...indices.map((i) =>
        fc.record({
          cardNumber: fc.constant(ALL_CARDS[i].number),
          minPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(999.99), noNaN: true }),
          buyLink: fc.webUrl(),
        })
      )
    ).map((items) => items as PriceData[])
  )

// ─── Property 13 ─────────────────────────────────────────────────────────────

/**
 * Validates: Requirements 5.6, 5.7
 *
 * Para qualquer conjunto de PriceData[] e qualquer subconjunto de cartas na
 * User_Collection, após aplicar a atualização de preços:
 * - APENAS cartas já na User_Collection têm last_price e buy_link atualizados
 * - Cartas NÃO presentes na User_Collection não são afetadas
 */
describe('Property 13: Atualização de preços respeita escopo da User_Collection', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedAll()
  })

  it('only cards in User_Collection have last_price and buy_link updated', () => {
    fc.assert(
      fc.property(userCollectionSubsetArb, priceDataListArb, (userSubset, priceDataList) => {
        // Reset DB for each run
        testDb = createTestDb()
        seedAll()

        // Add only the subset of cards to the User_Collection
        for (const idx of userSubset) {
          userCollectionRepo.addOrIncrement(ALL_CARDS[idx].id)
        }

        // Apply price updates
        applyPriceUpdates(COLLECTION_ID, priceDataList)

        // Build a set of card numbers in the User_Collection
        const userCollectionNumbers = new Set(userSubset.map((i) => ALL_CARDS[i].number))

        // Build a set of card numbers that received price data
        const pricedNumbers = new Set(priceDataList.map((p) => p.cardNumber))

        // Check every card in the DB
        for (const card of ALL_CARDS) {
          const row = testDb
            .prepare('SELECT last_price, buy_link FROM user_collection_entries WHERE card_id = ?')
            .get(card.id) as { last_price: number | null; buy_link: string | null } | undefined

          const isInUserCollection = userCollectionNumbers.has(card.number)
          const hasPriceData = pricedNumbers.has(card.number)

          if (!isInUserCollection) {
            // Card NOT in User_Collection: must have no DB row at all
            if (row !== undefined) return false
          } else {
            // Card IS in User_Collection: row must exist
            if (row === undefined) return false

            if (hasPriceData) {
              // Should have been updated: last_price and buy_link must be set
              if (row.last_price === null || row.buy_link === null) return false
            } else {
              // No price data for this card: last_price and buy_link must remain null
              if (row.last_price !== null || row.buy_link !== null) return false
            }
          }
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('cards NOT in User_Collection are never updated regardless of price data', () => {
    fc.assert(
      fc.property(userCollectionSubsetArb, priceDataListArb, (userSubset, priceDataList) => {
        // Reset DB for each run
        testDb = createTestDb()
        seedAll()

        // Add only the subset of cards to the User_Collection
        for (const idx of userSubset) {
          userCollectionRepo.addOrIncrement(ALL_CARDS[idx].id)
        }

        const userCollectionNumbers = new Set(userSubset.map((i) => ALL_CARDS[i].number))

        // Apply price updates
        applyPriceUpdates(COLLECTION_ID, priceDataList)

        // Cards NOT in User_Collection must have no entry in the DB
        for (const card of ALL_CARDS) {
          if (userCollectionNumbers.has(card.number)) continue

          const row = testDb
            .prepare('SELECT id FROM user_collection_entries WHERE card_id = ?')
            .get(card.id)

          if (row !== undefined) return false
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})
