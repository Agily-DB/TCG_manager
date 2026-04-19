import axios from 'axios'
import type { Collection, Card } from '../../shared/types'

const BASE_URL = 'https://api.pokemontcg.io/v2'
const PAGE_SIZE = 250
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry<T>(url: string, params: Record<string, unknown>): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get<T>(url, { params })
      return response.data
    } catch (err) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS)
      }
    }
  }
  throw lastError
}

interface ApiSet {
  id: string
  name: string
  series: string
  total: number
  releaseDate: string
  ptcgoCode?: string
  images?: {
    symbol?: string
    logo?: string
  }
}

interface ApiCard {
  id: string
  name: string
  number: string
  rarity?: string
  types?: string[]
  set: { id: string }
  images?: {
    small?: string
    large?: string
  }
}

interface ApiPage<T> {
  data: T[]
  page: number
  pageSize: number
  count: number
  totalCount: number
}

function mapSetToCollection(set: ApiSet): Collection {
  return {
    id: set.id,
    name: set.name,
    series: set.series,
    total: set.total,
    releaseDate: set.releaseDate,
    ptcgoCode: set.ptcgoCode,
    symbolUrl: set.images?.symbol,
    logoUrl: set.images?.logo,
  }
}

function mapApiCardToCard(card: ApiCard): Card {
  return {
    id: card.id,
    collectionId: card.set.id,
    name: card.name,
    number: card.number,
    rarity: card.rarity,
    types: card.types,
    imageSmall: card.images?.small,
    imageLarge: card.images?.large,
  }
}

export async function fetchAllSets(): Promise<Collection[]> {
  const collections: Collection[] = []
  let page = 1

  while (true) {
    const result = await fetchWithRetry<ApiPage<ApiSet>>(`${BASE_URL}/sets`, {
      page,
      pageSize: PAGE_SIZE,
    })

    for (const set of result.data) {
      collections.push(mapSetToCollection(set))
    }

    if (result.data.length < PAGE_SIZE) break
    page++
  }

  return collections
}

export async function fetchCardsForSet(setId: string): Promise<Card[]> {
  const cards: Card[] = []
  let page = 1

  while (true) {
    const result = await fetchWithRetry<ApiPage<ApiCard>>(`${BASE_URL}/cards`, {
      q: `set.id:${setId}`,
      page,
      pageSize: PAGE_SIZE,
    })

    for (const card of result.data) {
      cards.push(mapApiCardToCard(card))
    }

    if (result.data.length < PAGE_SIZE) break
    page++
  }

  return cards
}
