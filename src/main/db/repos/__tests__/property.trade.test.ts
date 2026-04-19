// Feature: pokemon-tcg-manager, Property 16: Trade atualiza User_Collection de forma consistente
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
import { tradeRepo } from '../tradeRepo'

// ─── Seed helpers ─────────────────────────────────────────────────────────────
const SEED_COLLECTION_ID = 'col-seed-trade'

function seedCollection() {
  collectionRepo.upsert({ id: SEED_COLLECTION_ID, name: 'Trade Test Collection' })
}

function seedCard(id: string, number: string) {
  cardRepo.upsert({
    id,
    collectionId: SEED_COLLECTION_ID,
    name: `Card ${number}`,
    number,
  })
}

function addToCollection(cardId: string, quantity: number) {
  for (let i = 0; i < quantity; i++) {
    testDb
      .prepare(
        `INSERT OR IGNORE INTO user_collection_entries (id, card_id, quantity, registered_at)
         VALUES (lower(hex(randomblob(16))), ?, 0, ?)`
      )
      .run(cardId, new Date().toISOString())
    testDb
      .prepare(
        'UPDATE user_collection_entries SET quantity = quantity + 1 WHERE card_id = ?'
      )
      .run(cardId)
  }
}

function getQuantity(cardId: string): number {
  const row = testDb
    .prepare('SELECT quantity FROM user_collection_entries WHERE card_id = ?')
    .get(cardId) as { quantity: number } | undefined
  return row?.quantity ?? 0
}

function entryExists(cardId: string): boolean {
  const row = testDb
    .prepare('SELECT id FROM user_collection_entries WHERE card_id = ?')
    .get(cardId)
  return row !== undefined
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

// Generate a small set of distinct card IDs to use in a single trade scenario
const tradeScenarioArb = fc.record({
  givenCount: fc.integer({ min: 1, max: 5 }),
  receivedCount: fc.integer({ min: 1, max: 5 }),
  initialQuantity: fc.integer({ min: 1, max: 10 }),
})

// ─── Property 16: Trade atualiza User_Collection de forma consistente ─────────

/**
 * Validates: Requirements 7.3
 *
 * Para qualquer trade com cartas cedidas (C_given) e recebidas (C_received),
 * após createTrade:
 * - Cartas em C_given têm quantidade reduzida (ou removidas se chegar a 0)
 * - Cartas em C_received têm quantidade incrementada (ou adicionadas se não existiam)
 */
describe('Property 16: Trade atualiza User_Collection de forma consistente', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedCollection()
  })

  it('cartas cedidas têm quantidade reduzida; cartas recebidas têm quantidade incrementada', () => {
    fc.assert(
      fc.property(tradeScenarioArb, ({ givenCount, receivedCount, initialQuantity }) => {
        // Reset DB for each property run
        testDb = createTestDb()
        seedCollection()

        // Seed given cards (distinct from received)
        const givenCardIds: string[] = []
        for (let i = 0; i < givenCount; i++) {
          const id = `given-card-${i}`
          seedCard(id, `G${String(i).padStart(3, '0')}`)
          addToCollection(id, initialQuantity)
          givenCardIds.push(id)
        }

        // Seed received cards (distinct IDs)
        const receivedCardIds: string[] = []
        for (let i = 0; i < receivedCount; i++) {
          const id = `recv-card-${i}`
          seedCard(id, `R${String(i).padStart(3, '0')}`)
          receivedCardIds.push(id)
        }

        // Capture quantities before trade
        const beforeGiven = givenCardIds.map((id) => ({ id, qty: getQuantity(id) }))
        const beforeReceived = receivedCardIds.map((id) => ({ id, qty: getQuantity(id) }))

        // Execute trade: give one of each given card, receive one of each received card
        tradeRepo.create({
          tradedAt: new Date().toISOString(),
          given: givenCardIds.map((cardId) => ({ cardId })),
          received: receivedCardIds.map((cardId) => ({ cardId })),
        })

        // Verify given cards: quantity reduced by 1 (or entry removed if was 1)
        for (const { id, qty: before } of beforeGiven) {
          const after = getQuantity(id)
          if (before > 1) {
            // quantity must be reduced by 1
            if (after !== before - 1) return false
          } else {
            // entry must be removed (quantity was 1)
            if (entryExists(id)) return false
          }
        }

        // Verify received cards: quantity incremented by 1 (or added with quantity 1)
        for (const { id, qty: before } of beforeReceived) {
          const after = getQuantity(id)
          if (before === 0) {
            // entry must be created with quantity 1
            if (after !== 1) return false
          } else {
            // quantity must be incremented by 1
            if (after !== before + 1) return false
          }
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('cartas cedidas com quantidade 1 são removidas da coleção', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (cardCount) => {
        testDb = createTestDb()
        seedCollection()

        const cardIds: string[] = []
        for (let i = 0; i < cardCount; i++) {
          const id = `single-card-${i}`
          seedCard(id, `S${String(i).padStart(3, '0')}`)
          addToCollection(id, 1) // exactly 1 copy
          cardIds.push(id)
        }

        tradeRepo.create({
          tradedAt: new Date().toISOString(),
          given: cardIds.map((cardId) => ({ cardId })),
          received: [],
        })

        // All given cards with quantity 1 must be removed
        for (const id of cardIds) {
          if (entryExists(id)) return false
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('cartas recebidas sem entrada prévia são adicionadas com quantidade 1', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 5 }), (cardCount) => {
        testDb = createTestDb()
        seedCollection()

        const cardIds: string[] = []
        for (let i = 0; i < cardCount; i++) {
          const id = `new-recv-card-${i}`
          seedCard(id, `N${String(i).padStart(3, '0')}`)
          cardIds.push(id)
        }

        // Ensure none exist before trade
        for (const id of cardIds) {
          if (entryExists(id)) return false
        }

        tradeRepo.create({
          tradedAt: new Date().toISOString(),
          given: [],
          received: cardIds.map((cardId) => ({ cardId })),
        })

        // All received cards must now exist with quantity 1
        for (const id of cardIds) {
          if (getQuantity(id) !== 1) return false
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})
