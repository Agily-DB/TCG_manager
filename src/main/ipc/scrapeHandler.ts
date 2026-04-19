import { ipcMain } from 'electron'
import { scrapeCollectionPrices } from '../scraper'
import { collectionRepo } from '../db/repos/collectionRepo'
import { userCollectionRepo } from '../db/repos/userCollectionRepo'
import type { ScrapeResult } from '../../shared/types'

function buildLigaUrlFromCode(ptcgoCode: string): string {
  return `https://www.ligapokemon.com.br/?view=cards%2Fsearch&tipo=1&card=ed%3D${ptcgoCode}`
}

export function registerScrapeHandlers(): void {
  ipcMain.handle('scrapeCollectionPrices', async (_, collectionId: string): Promise<ScrapeResult> => {
    const collection = collectionRepo.findById(collectionId)

    console.log(`[scrape] collectionId=${collectionId} ptcgoCode=${collection?.ptcgoCode ?? 'null'}`)

    const ptcgoCode = collection?.ptcgoCode

    if (!ptcgoCode) {
      return {
        updated: 0,
        errors: [`Coleção "${collectionId}" não possui código PTCGO. Tente sincronizar novamente nas Configurações.`]
      }
    }

    const url = buildLigaUrlFromCode(ptcgoCode)
    console.log(`[scrape] url=${url}`)

    try {
      const priceDataList = await scrapeCollectionPrices(url)

      if (priceDataList.length === 0) {
        return { updated: 0, errors: [`Nenhum preço encontrado na página do LigaPokemon para a coleção "${collectionId}" (ptcgoCode: ${ptcgoCode}). Verifique se a URL está correta: ${url}`] }
      }

      const entries = userCollectionRepo.findByCollection(collectionId)
      let updated = 0

      // Debug: se nenhum match, retornar info diagnóstica
      const samplePrice = priceDataList[0]?.cardNumber ?? 'none'
      const sampleEntry = entries[0]?.card.number ?? 'none'

      for (const priceData of priceDataList) {
        // Match by card number — normalize both sides (remove leading zeros)
        const normalizedPriceNum = priceData.cardNumber.replace(/^0+/, '') || priceData.cardNumber
        const match = entries.find((e) => {
          const normalizedEntryNum = e.card.number.replace(/^0+/, '') || e.card.number
          return normalizedEntryNum === normalizedPriceNum
        })
        if (match) {
          userCollectionRepo.updatePrice(match.cardId, priceData.minPrice, priceData.buyLink)
          updated++
        }
      }

      if (updated === 0) {
        return {
          updated: 0,
          errors: [`Nenhum match encontrado. LigaPokemon retornou ${priceDataList.length} preços (ex: carta "${samplePrice}"). Seu banco tem ${entries.length} entradas (ex: carta "${sampleEntry}").`]
        }
      }

      return { updated, errors: [] }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { updated: 0, errors: [message] }
    }
  })
}
