import { ipcMain, BrowserWindow } from 'electron'
import { syncLogRepo } from '../db/repos/syncLogRepo'
import { syncCollectionList, importCardsForCollections } from '../importer/initialImporter'

export function registerSyncHandlers(win: BrowserWindow): void {
  ipcMain.handle('startInitialImport', async () => {
    // Don't start if already running
    if (syncLogRepo.getLastRunning()) return

    // Step 1: single API call — compare remote sets vs local, persist new collections
    // This is fast and unblocks the UI immediately
    const newCollectionIds = await syncCollectionList(win)

    // Step 2: import cards for new collections in the background (non-blocking)
    if (newCollectionIds.length > 0) {
      const lastFailed = syncLogRepo.getLastFailed()
      const resumeFrom = lastFailed ? lastFailed.lastCollectionIndex : 0
      // Fire and forget — renderer gets progress via IPC events
      importCardsForCollections(win, newCollectionIds, resumeFrom).catch((err) => {
        console.error('Card import failed:', err)
      })
    }
  })

  ipcMain.handle('startSync', async () => {
    if (syncLogRepo.getLastRunning()) return
    const newCollectionIds = await syncCollectionList(win)
    if (newCollectionIds.length > 0) {
      importCardsForCollections(win, newCollectionIds).catch((err) => {
        console.error('Sync failed:', err)
      })
    }
  })

  ipcMain.handle('getSyncStatus', () => {
    const lastCompleted = syncLogRepo.getLastCompleted()
    const lastRunning = syncLogRepo.getLastRunning()
    const lastFailed = syncLogRepo.getLastFailed()
    return {
      lastSyncAt: lastCompleted?.finishedAt,
      isRunning: !!lastRunning,
      hasFailed: !!lastFailed && !lastCompleted,
      lastFailedIndex: lastFailed?.lastCollectionIndex,
    }
  })
}
