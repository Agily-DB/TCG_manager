import { describe, it, expect, beforeEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import { createTestDb } from './testDb'

// ─── Module mock setup ────────────────────────────────────────────────────────
// We mock the database module so repos use our in-memory instance instead of
// the real file-based DB (which requires Electron's app.getPath).

let testDb: Database.Database

vi.mock('../../database', () => ({
  getDatabase: () => testDb,
  initDatabase: () => testDb,
}))

// Import repos AFTER the mock is registered
import { purchaseRepo } from '../purchaseRepo'
import { userCollectionRepo } from '../userCollectionRepo'
import { deckRepo } from '../deckRepo'
import { cardRepo } from '../cardRepo'
import { collectionRepo } from '../collectionRepo'

// ─── Seed helpers ─────────────────────────────────────────────────────────────

function seedCollection(id = 'col-1', name = 'Scarlet & Violet') {
  collectionRepo.upsert({ id, name })
  return id
}

function seedCard(id = 'card-1', collectionId = 'col-1', number = '001') {
  cardRepo.upsert({ id, collectionId, name: 'Bulbasaur', number })
  return id
}

// ─── PurchaseRepo ─────────────────────────────────────────────────────────────

describe('PurchaseRepo', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedCollection()
  })

  it('create persists a purchase and returns it with the generated id', () => {
    const data = {
      productType: 'Booster',
      collectionId: 'col-1',
      quantity: 3,
      unitPrice: 12.5,
      purchasedAt: '2024-01-15T10:00:00.000Z',
    }

    const purchase = purchaseRepo.create(data)

    expect(purchase.id).toBeTruthy()
    expect(purchase.productType).toBe('Booster')
    expect(purchase.collectionId).toBe('col-1')
    expect(purchase.quantity).toBe(3)
    expect(purchase.unitPrice).toBe(12.5)
    expect(purchase.purchasedAt).toBe('2024-01-15T10:00:00.000Z')
  })

  it('findAll returns purchases ordered by purchasedAt descending', () => {
    purchaseRepo.create({
      productType: 'Booster',
      collectionId: 'col-1',
      quantity: 1,
      unitPrice: 10,
      purchasedAt: '2024-01-01T00:00:00.000Z',
    })
    purchaseRepo.create({
      productType: 'ETB',
      collectionId: 'col-1',
      quantity: 1,
      unitPrice: 150,
      purchasedAt: '2024-03-01T00:00:00.000Z',
    })
    purchaseRepo.create({
      productType: 'Blister',
      collectionId: 'col-1',
      quantity: 2,
      unitPrice: 25,
      purchasedAt: '2024-02-15T00:00:00.000Z',
    })

    const purchases = purchaseRepo.findAll()

    expect(purchases).toHaveLength(3)
    // Verify descending order
    for (let i = 0; i < purchases.length - 1; i++) {
      expect(purchases[i].purchasedAt >= purchases[i + 1].purchasedAt).toBe(true)
    }
    expect(purchases[0].purchasedAt).toBe('2024-03-01T00:00:00.000Z')
    expect(purchases[2].purchasedAt).toBe('2024-01-01T00:00:00.000Z')
  })

  it('findAll returns empty array when no purchases exist', () => {
    expect(purchaseRepo.findAll()).toEqual([])
  })

  it('findById returns null for unknown id', () => {
    seedCollection('col-2', 'Base Set')
    const result = purchaseRepo.findById('non-existent-id')
    expect(result).toBeNull()
  })

  it('findById returns purchase detail with collection', () => {
    const purchase = purchaseRepo.create({
      productType: 'Booster',
      collectionId: 'col-1',
      quantity: 1,
      unitPrice: 10,
      purchasedAt: '2024-01-01T00:00:00.000Z',
    })

    const detail = purchaseRepo.findById(purchase.id)

    expect(detail).not.toBeNull()
    expect(detail!.id).toBe(purchase.id)
    expect(detail!.collection.id).toBe('col-1')
    expect(detail!.collection.name).toBe('Scarlet & Violet')
  })
})

// ─── UserCollectionRepo ───────────────────────────────────────────────────────

describe('UserCollectionRepo', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedCollection()
    seedCard()
  })

  it('addOrIncrement inserts a new entry with quantity 1 on first call', () => {
    userCollectionRepo.addOrIncrement('card-1')

    const entries = userCollectionRepo.findByCollection('col-1')
    expect(entries).toHaveLength(1)
    expect(entries[0].cardId).toBe('card-1')
    expect(entries[0].quantity).toBe(1)
  })

  it('addOrIncrement increments quantity when card already exists (duplicate)', () => {
    userCollectionRepo.addOrIncrement('card-1')
    userCollectionRepo.addOrIncrement('card-1')
    userCollectionRepo.addOrIncrement('card-1')

    const entries = userCollectionRepo.findByCollection('col-1')
    expect(entries).toHaveLength(1)
    expect(entries[0].quantity).toBe(3)
  })

  it('addOrIncrement creates separate entries for different cards', () => {
    seedCard('card-2', 'col-1', '002')

    userCollectionRepo.addOrIncrement('card-1')
    userCollectionRepo.addOrIncrement('card-2')
    userCollectionRepo.addOrIncrement('card-1')

    const entries = userCollectionRepo.findByCollection('col-1')
    expect(entries).toHaveLength(2)

    const card1Entry = entries.find((e) => e.cardId === 'card-1')!
    const card2Entry = entries.find((e) => e.cardId === 'card-2')!
    expect(card1Entry.quantity).toBe(2)
    expect(card2Entry.quantity).toBe(1)
  })

  it('addOrIncrement stores productUnitId when provided', () => {
    // Need a real purchase + product_unit to satisfy the FK constraint
    const purchase = purchaseRepo.create({
      productType: 'Booster',
      collectionId: 'col-1',
      quantity: 1,
      unitPrice: 10,
      purchasedAt: '2024-01-01T00:00:00.000Z',
    })
    // Insert a product_unit directly so we have a valid FK target
    testDb
      .prepare(
        "INSERT INTO product_units (id, purchase_id, opening_status) VALUES (?, ?, 'Pending')"
      )
      .run('unit-abc', purchase.id)

    userCollectionRepo.addOrIncrement('card-1', 'unit-abc')

    const entries = userCollectionRepo.findByCollection('col-1')
    expect(entries[0].productUnitId).toBe('unit-abc')
  })

  it('findSummary returns collection summary with correct distinctCardCount', () => {
    seedCard('card-2', 'col-1', '002')

    userCollectionRepo.addOrIncrement('card-1')
    userCollectionRepo.addOrIncrement('card-1') // duplicate — should not increase distinct count
    userCollectionRepo.addOrIncrement('card-2')

    const summary = userCollectionRepo.findSummary()
    expect(summary).toHaveLength(1)
    expect(summary[0].collection.id).toBe('col-1')
    expect(summary[0].distinctCardCount).toBe(2)
  })

  it('findByCollection returns empty array for collection with no entries', () => {
    seedCollection('col-2', 'Base Set')
    expect(userCollectionRepo.findByCollection('col-2')).toEqual([])
  })
})

// ─── DeckRepo ─────────────────────────────────────────────────────────────────

describe('DeckRepo', () => {
  beforeEach(() => {
    testDb = createTestDb()
    seedCollection()
    seedCard()
  })

  it('create returns a deck with id, name and timestamps', () => {
    const deck = deckRepo.create('My Deck')

    expect(deck.id).toBeTruthy()
    expect(deck.name).toBe('My Deck')
    expect(deck.createdAt).toBeTruthy()
    expect(deck.updatedAt).toBeTruthy()
  })

  it('findAll returns all decks ordered by createdAt descending', () => {
    deckRepo.create('Deck A')
    deckRepo.create('Deck B')
    deckRepo.create('Deck C')

    const decks = deckRepo.findAll()
    expect(decks).toHaveLength(3)
    // Verify descending order
    for (let i = 0; i < decks.length - 1; i++) {
      expect(decks[i].createdAt >= decks[i + 1].createdAt).toBe(true)
    }
  })

  it('findAll returns empty array when no decks exist', () => {
    expect(deckRepo.findAll()).toEqual([])
  })

  it('findById returns null for unknown id', () => {
    expect(deckRepo.findById('non-existent')).toBeNull()
  })

  it('findById returns deck detail with cards and totalCards', () => {
    const deck = deckRepo.create('Test Deck')
    deckRepo.addCard(deck.id, 'card-1', 2)

    const detail = deckRepo.findById(deck.id)

    expect(detail).not.toBeNull()
    expect(detail!.id).toBe(deck.id)
    expect(detail!.cards).toHaveLength(1)
    expect(detail!.cards[0].quantity).toBe(2)
    expect(detail!.totalCards).toBe(2)
  })

  it('delete removes the deck', () => {
    const deck = deckRepo.create('To Delete')
    deckRepo.delete(deck.id)

    expect(deckRepo.findById(deck.id)).toBeNull()
    expect(deckRepo.findAll()).toHaveLength(0)
  })

  it('update renames the deck', () => {
    const deck = deckRepo.create('Old Name')
    deckRepo.update(deck.id, { name: 'New Name' })

    const updated = deckRepo.findById(deck.id)
    expect(updated!.name).toBe('New Name')
  })

  // ── Deck limit validations (Requirements 6.4, 6.6) ──────────────────────────

  it('addCard throws when adding cards would exceed the 60-card limit', () => {
    // Seed 60 distinct cards and add them
    for (let i = 1; i <= 15; i++) {
      seedCard(`card-limit-${i}`, 'col-1', `${100 + i}`)
    }

    const deck = deckRepo.create('Full Deck')

    // Add 4 copies of 15 cards = 60 total
    for (let i = 1; i <= 15; i++) {
      deckRepo.addCard(deck.id, `card-limit-${i}`, 4)
    }

    // Deck is now at 60 — adding one more should throw
    seedCard('card-overflow', 'col-1', '200')
    expect(() => deckRepo.addCard(deck.id, 'card-overflow', 1)).toThrow(
      'Deck cannot exceed 60 cards'
    )
  })

  it('addCard throws when adding more than 4 copies of the same card', () => {
    const deck = deckRepo.create('Copy Limit Deck')

    deckRepo.addCard(deck.id, 'card-1', 4)

    expect(() => deckRepo.addCard(deck.id, 'card-1', 1)).toThrow(
      'Cannot have more than 4 copies of the same card in a deck'
    )
  })

  it('addCard allows up to 4 copies of the same card', () => {
    const deck = deckRepo.create('Four Copies Deck')

    deckRepo.addCard(deck.id, 'card-1', 2)
    deckRepo.addCard(deck.id, 'card-1', 2)

    const detail = deckRepo.findById(deck.id)
    expect(detail!.totalCards).toBe(4)
    expect(detail!.cards[0].quantity).toBe(4)
  })

  it('removeCard removes a card from the deck', () => {
    const deck = deckRepo.create('Remove Test')
    deckRepo.addCard(deck.id, 'card-1', 2)
    deckRepo.removeCard(deck.id, 'card-1')

    const detail = deckRepo.findById(deck.id)
    expect(detail!.cards).toHaveLength(0)
    expect(detail!.totalCards).toBe(0)
  })

  it('update replaces deck cards entirely', () => {
    seedCard('card-2', 'col-1', '002')
    const deck = deckRepo.create('Update Cards Deck')
    deckRepo.addCard(deck.id, 'card-1', 3)

    deckRepo.update(deck.id, {
      cards: [{ cardId: 'card-2', quantity: 2 }],
    })

    const detail = deckRepo.findById(deck.id)
    expect(detail!.cards).toHaveLength(1)
    expect(detail!.cards[0].card.id).toBe('card-2')
    expect(detail!.totalCards).toBe(2)
  })
})
