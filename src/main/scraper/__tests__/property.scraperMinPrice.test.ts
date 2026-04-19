// Feature: pokemon-tcg-manager, Property 12: Price Scraper extrai o menor preço disponível por carta
import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import { aggregatePrices, parsePrice, type RawPriceItem } from '../priceScraper'

/**
 * Validates: Requirements 5.4
 *
 * Para qualquer conjunto de RawPriceItems com múltiplos preços por carta,
 * aggregatePrices retorna exatamente o menor valor numérico por cardNumber.
 */
describe('Property 12: Price Scraper extrai o menor preço disponível por carta', () => {
  // Arbitrary for a valid price string in Brazilian format (e.g. "R$ 12,50")
  const priceValueArb = fc.float({ min: Math.fround(0.01), max: Math.fround(9999.99), noNaN: true }).map((v) => {
    const fixed = v.toFixed(2).replace('.', ',')
    return `R$ ${fixed}`
  })

  // Arbitrary for a card number like "001" or "SV-123"
  const cardNumberArb = fc.stringMatching(/^[A-Z0-9]{1,3}-?[0-9]{1,3}$/).filter((s) => s.length > 0)

  // Arbitrary: one or more price entries for a single card number
  const cardPricesArb = fc.record({
    cardNumber: cardNumberArb,
    prices: fc.array(priceValueArb, { minLength: 1, maxLength: 10 }),
    buyLink: fc.webUrl(),
  })

  // Arbitrary: multiple distinct cards, each with multiple price entries
  const multiCardArb = fc
    .array(cardPricesArb, { minLength: 1, maxLength: 20 })
    .map((cards) => {
      // Deduplicate by cardNumber
      const seen = new Set<string>()
      return cards.filter(({ cardNumber }) => {
        if (seen.has(cardNumber)) return false
        seen.add(cardNumber)
        return true
      })
    })
    .filter((cards) => cards.length > 0)

  it('returns the minimum price for each card across all entries', () => {
    fc.assert(
      fc.property(multiCardArb, (cards) => {
        // Build raw items: multiple entries per card with different prices
        const rawItems: RawPriceItem[] = cards.flatMap(({ cardNumber, prices, buyLink }) =>
          prices.map((priceText) => ({ cardNumber, priceText, buyLink }))
        )

        const result = aggregatePrices(rawItems)

        // For each card, verify the result contains the minimum price
        for (const { cardNumber, prices } of cards) {
          const parsedPrices = prices.map(parsePrice)
          const expectedMin = Math.min(...parsedPrices)

          const entry = result.find((r) => r.cardNumber === cardNumber)
          if (!entry) return false
          if (Math.abs(entry.minPrice - expectedMin) > 0.0001) return false
        }

        return true
      }),
      { numRuns: 100 }
    )
  })

  it('result contains exactly one entry per distinct cardNumber', () => {
    fc.assert(
      fc.property(multiCardArb, (cards) => {
        const rawItems: RawPriceItem[] = cards.flatMap(({ cardNumber, prices, buyLink }) =>
          prices.map((priceText) => ({ cardNumber, priceText, buyLink }))
        )

        const result = aggregatePrices(rawItems)

        const resultCardNumbers = result.map((r) => r.cardNumber)
        const uniqueResultCardNumbers = new Set(resultCardNumbers)

        // No duplicates in result
        if (uniqueResultCardNumbers.size !== resultCardNumbers.length) return false

        // Every input card number appears in result
        for (const { cardNumber } of cards) {
          if (!uniqueResultCardNumbers.has(cardNumber)) return false
        }

        return true
      }),
      { numRuns: 100 }
    )
  })
})
