import type { BrowserWindow } from 'electron'
import { collectionRepo } from '../db/repos/collectionRepo'
import { cardRepo } from '../db/repos/cardRepo'
import { syncLogRepo } from '../db/repos/syncLogRepo'
import { fetchAllSets, fetchCardsForSet } from './pokemonTCGClient'

const DELAY_MS = 200

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Step 1 — Quick check: fetch only the sets list (1 API call) and persist
 * any collections not yet in the local DB. Returns the list of new collection
 * IDs that still need their cards imported.
 */
export async function syncCollectionList(win: BrowserWindow): Promise<string[]> {
  const logEntry = syncLogRepo.createEntry('initial_import')

  try {
    // Single API call to get all sets
    const allSets = await fetchAllSets()

    const existingIds = new Set(collectionRepo.findAll().map((c) => c.id))
    const newCollections = allSets.filter((c) => !existingIds.has(c.id))

    // Upsert ALL collections to keep ptcgo_code and other fields up to date
    for (const col of allSets) {
      collectionRepo.upsert(col)
    }
    console.log(`[sync] upserted ${allSets.length} collections, sample ptcgoCode: ${allSets[0]?.ptcgoCode ?? 'null'}`)

    if (newCollections.length === 0) {
      // Nothing to import — mark complete right away
      syncLogRepo.updateEntry(logEntry.id, {
        status: 'completed',
        finishedAt: new Date().toISOString(),
      })
      win.webContents.send('importProgress', {
        current: allSets.length,
        total: allSets.length,
        collectionName: 'Banco atualizado',
      })
      return []
    }

    // Signal renderer: collections saved, cards still pending
    win.webContents.send('importProgress', {
      current: existingIds.size,
      total: allSets.length,
      collectionName: `${newCollections.length} coleções novas encontradas`,
    })

    syncLogRepo.updateEntry(logEntry.id, { lastCollectionIndex: 0 })
    return newCollections.map((c) => c.id)
  } catch (err) {
    syncLogRepo.updateEntry(logEntry.id, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
    })
    throw err
  }
}

/**
 * Step 2 — Background card import: fetch cards for each new collection.
 * Runs after syncCollectionList so the UI is already usable.
 */
export async function importCardsForCollections(
  win: BrowserWindow,
  collectionIds: string[],
  resumeFromIndex = 0
): Promise<void> {
  const logEntry = syncLogRepo.createEntry('initial_import')
  const total = collectionRepo.findAll().length

  try {
    for (let i = resumeFromIndex; i < collectionIds.length; i++) {
      const collectionId = collectionIds[i]
      const collection = collectionRepo.findById(collectionId)
      if (!collection) continue

      // Skip cards already imported for this collection
      const existingCardIds = new Set(
        cardRepo.findByFilter({ collectionId }).map((c) => c.id)
      )

      let cards
      let attempts = 0
      while (true) {
        try {
          cards = await fetchCardsForSet(collectionId)
          break
        } catch (err: unknown) {
          attempts++
          const isRateLimit =
            err instanceof Error &&
            (err.message.includes('429') || err.message.includes('rate'))
          if (isRateLimit && attempts < 5) {
            await sleep(2000 * attempts)
            continue
          }
          throw err
        }
      }

      for (const card of cards) {
        if (!existingCardIds.has(card.id)) {
          cardRepo.upsert(card)
        }
      }

      syncLogRepo.updateEntry(logEntry.id, { lastCollectionIndex: i })

      win.webContents.send('importProgress', {
        current: total - collectionIds.length + i + 1,
        total,
        collectionName: collection.name,
      })

      if (i < collectionIds.length - 1) {
        await sleep(DELAY_MS)
      }
    }

    syncLogRepo.updateEntry(logEntry.id, {
      status: 'completed',
      finishedAt: new Date().toISOString(),
    })
  } catch (err) {
    syncLogRepo.updateEntry(logEntry.id, {
      status: 'failed',
      finishedAt: new Date().toISOString(),
    })
    throw err
  }
}

/** Legacy entry point — runs both steps sequentially */
export async function runImport(win: BrowserWindow, resumeFromIndex?: number): Promise<void> {
  const newIds = await syncCollectionList(win)
  if (newIds.length > 0) {
    await importCardsForCollections(win, newIds, resumeFromIndex ?? 0)
  }
}
