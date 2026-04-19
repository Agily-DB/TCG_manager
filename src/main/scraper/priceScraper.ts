import puppeteer from 'puppeteer'

export interface PriceData {
  cardNumber: string
  minPrice: number
  buyLink: string
}

export interface RawPriceItem {
  cardNumber: string
  priceText: string
  buyLink: string
}

/**
 * Parses a price string like "R$ 12,50" or "12.50" into a number.
 * Returns 0 if no valid price is found.
 */
export function parsePrice(priceText: string): number {
  const priceMatch = priceText.replace(/\s/g, '').match(/[\d]+[,.][\d]+/)
  return priceMatch ? parseFloat(priceMatch[0].replace(',', '.')) : 0
}

/**
 * Aggregates raw price items by cardNumber, returning the minimum price per card.
 * Pure function — no side effects.
 */
export function aggregatePrices(items: RawPriceItem[]): PriceData[] {
  const map = new Map<string, { minPrice: number; buyLink: string }>()

  for (const item of items) {
    const price = parsePrice(item.priceText)
    const existing = map.get(item.cardNumber)
    if (!existing || price < existing.minPrice) {
      map.set(item.cardNumber, { minPrice: price, buyLink: item.buyLink })
    }
  }

  return Array.from(map.entries()).map(([cardNumber, { minPrice, buyLink }]) => ({
    cardNumber,
    minPrice,
    buyLink,
  }))
}

interface LigaCardJson {
  sSigla: string  // edition tag e.g. "ASC"
  sN: string      // card number e.g. "251"
  p1a: string     // min price e.g. "8.10"
  idE: number     // edition id e.g. 754
}

async function attemptScrape(url: string): Promise<PriceData[]> {
  const browser = await puppeteer.launch({ headless: true })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(30000)

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // Wait for the page script to load
    await page.waitForSelector('.card-item', { timeout: 15000 }).catch(() => {})

    // Extract cardsjson from the embedded script — all cards with prices are here
    // This avoids needing to click "Mostrar mais" since all data is in the initial HTML
    const cards = await page.evaluate(() => {
      // Find the cardsjson variable in the page scripts
      const scripts = Array.from(document.querySelectorAll('script'))
      for (const script of scripts) {
        const text = script.textContent ?? ''
        const match = text.match(/var cardsjson\s*=\s*(\[[\s\S]*?\]);/)
        if (match) {
          try {
            return JSON.parse(match[1]) as Array<{
              sN: string
              nEN: string
              p1a: string
              sSigla: string
              idE: number
            }>
          } catch {
            return null
          }
        }
      }
      return null
    })

    if (!cards || cards.length === 0) {
      // Fallback: try DOM scraping if JSON extraction fails
      const title = await page.title()
      throw new Error(`Não foi possível extrair cardsjson da página. Título: "${title}". URL: ${url}`)
    }

    // Get the printed total from the page (e.g. "295 cards" -> 295)
    const printedTotal = await page.evaluate(() => {
      const el = document.querySelector('.tb-cards-count')
      const text = el?.textContent ?? ''
      const match = text.match(/(\d+)/)
      return match ? parseInt(match[1]) : 0
    })

    const editionTag = cards[0]?.sSigla ?? ''

    const results: PriceData[] = cards
      .filter((c) => c.sN && c.p1a && parseFloat(c.p1a) > 0)
      .map((c) => {
        // Normalize card number: remove leading zeros for matching
        const cardNumber = c.sN.replace(/^0+/, '') || c.sN
        const minPrice = parseFloat(c.p1a)

        // Build direct card page link:
        // /?view=cards/card&card=NAME(NUM/PRINTEDTOTAL)&ed=TAG&num=NUM
        // e.g. /?view=cards/card&card=Mega%20Dragonite%20ex%20(290/217)&ed=ASC&num=290
        // nEN format is "Mega Dragonite ex (#290/217)" — strip the (#NUM/TOTAL) suffix
        const baseName = c.nEN.replace(/\s*\(#?\d+[A-Za-z]?\/\d+\)\s*$/, '').trim()
        const cardParam = `${baseName} (${c.sN}/${printedTotal})`
        const buyLink = `https://www.ligapokemon.com.br/?view=cards/card&card=${encodeURIComponent(cardParam)}&ed=${editionTag}&num=${c.sN}`

        return { cardNumber, minPrice, buyLink }
      })

    // Aggregate to keep minimum price per card number
    const priceMap = new Map<string, PriceData>()
    for (const item of results) {
      const existing = priceMap.get(item.cardNumber)
      if (!existing || item.minPrice < existing.minPrice) {
        priceMap.set(item.cardNumber, item)
      }
    }

    return Array.from(priceMap.values())
  } finally {
    await browser.close()
  }
}

export async function scrapeCollectionPrices(ligaUrl: string): Promise<PriceData[]> {
  const maxRetries = 2
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await attemptScrape(ligaUrl)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const isRetryable =
        lastError.message.includes('net::') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('Navigation')

      if (!isRetryable || attempt === maxRetries) {
        throw lastError
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  throw lastError ?? new Error('Scraping failed')
}
