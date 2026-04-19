// ─── Domain Types ────────────────────────────────────────────────────────────

export type OpeningStatus = 'Pending' | 'In_Progress' | 'Completed'
export type TradeDirection = 'given' | 'received'
export type ProductType =
  | 'Booster'
  | 'Blister'
  | 'ETB'
  | 'Booster_Box'
  | 'Tin'
  | 'Starter_Deck'
  | 'Bundle'
  | string

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface Collection {
  id: string
  name: string
  series?: string
  total?: number
  releaseDate?: string
  symbolUrl?: string
  logoUrl?: string
  ptcgoCode?: string
}

export interface Card {
  id: string
  collectionId: string
  name: string
  number: string
  rarity?: string
  types?: string[]
  imageSmall?: string
  imageLarge?: string
}

export interface Purchase {
  id: string
  productType: ProductType
  collectionId: string
  quantity: number
  unitPrice: number
  purchasedAt: string
}

export interface PurchaseDetail extends Purchase {
  collection: Collection
  productUnits: ProductUnit[]
}

export interface ProductUnit {
  id: string
  purchaseId: string
  openingStatus: OpeningStatus
  startedAt?: string
  completedAt?: string
}

export interface UserCollectionEntry {
  id: string
  cardId: string
  card: Card
  productUnitId?: string
  quantity: number
  lastPrice?: number
  buyLink?: string
  priceUpdatedAt?: string
  registeredAt: string
}

export interface CollectionSummary {
  collection: Collection
  distinctCardCount: number
  totalValue: number
  lastPriceUpdate?: string
}

// ─── Deck ────────────────────────────────────────────────────────────────────

export interface Deck {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface DeckDetail extends Deck {
  cards: Array<{ card: Card; quantity: number }>
  totalCards: number
}

// ─── Trade ───────────────────────────────────────────────────────────────────

export interface TradeCard {
  id: string
  tradeId: string
  cardId?: string
  card?: Card
  direction: TradeDirection
  cardName?: string
  cardNumber?: string
  collectionName?: string
}

export interface Trade {
  id: string
  tradedAt: string
  notes?: string
}

export interface TradeDetail extends Trade {
  given: TradeCard[]
  received: TradeCard[]
}

// ─── Import / Sync ───────────────────────────────────────────────────────────

export interface ImportProgress {
  current: number
  total: number
  collectionName: string
}

export interface SyncStatus {
  lastSyncAt?: string
  isRunning: boolean
  hasFailed?: boolean
  lastFailedIndex?: number
}

export interface ScrapeResult {
  updated: number
  errors: string[]
}

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CardFilter {
  collectionId?: string
  search?: string
}

export interface CreatePurchaseDTO {
  productType: ProductType
  collectionId: string
  quantity: number
  unitPrice: number
  purchasedAt: string
}

export interface AddCardDTO {
  cardId: string
  productUnitId?: string
}

export interface UpdateDeckDTO {
  name?: string
  cards?: Array<{ cardId: string; quantity: number }>
}

export interface CreateTradeDTO {
  tradedAt: string
  notes?: string
  given: Array<{ cardId: string }>
  received: Array<{ cardId?: string; cardName?: string; cardNumber?: string; collectionName?: string }>
}

// ─── IPC Bridge ──────────────────────────────────────────────────────────────

export interface ElectronAPI {
  // Collections & Cards
  getCollections(): Promise<Collection[]>
  getCards(filter: CardFilter): Promise<Card[]>
  getCardById(id: string): Promise<Card | null>

  // Purchases & Product Units
  createPurchase(data: CreatePurchaseDTO): Promise<Purchase>
  getPurchases(): Promise<Purchase[]>
  getPurchaseById(id: string): Promise<PurchaseDetail>
  getProductUnit(id: string): Promise<ProductUnit>
  updateProductUnitStatus(id: string, status: OpeningStatus): Promise<void>

  // User Collection
  getUserCollectionSummary(): Promise<CollectionSummary[]>
  getUserCollectionCards(collectionId: string): Promise<UserCollectionEntry[]>
  addCardToCollection(entry: AddCardDTO): Promise<void>

  // Decks
  createDeck(name: string): Promise<Deck>
  getDecks(): Promise<Deck[]>
  getDeckById(id: string): Promise<DeckDetail>
  updateDeck(id: string, data: UpdateDeckDTO): Promise<void>
  deleteDeck(id: string): Promise<void>

  // Trades
  createTrade(data: CreateTradeDTO): Promise<Trade>
  getTrades(): Promise<Trade[]>
  getTradeById(id: string): Promise<TradeDetail>

  // Prices
  scrapeCollectionPrices(collectionId: string): Promise<ScrapeResult>

  // Sync
  startInitialImport(): Promise<void>
  startSync(): Promise<void>
  getSyncStatus(): Promise<SyncStatus>
  onImportProgress(cb: (progress: ImportProgress) => void): () => void
  onDbEmpty(cb: () => void): () => void
}
