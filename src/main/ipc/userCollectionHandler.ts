import { ipcMain } from 'electron'
import { userCollectionRepo } from '../db'
import type { AddCardDTO } from '../../shared/types'

export function registerUserCollectionHandlers(): void {
  ipcMain.handle('getUserCollectionSummary', async () => {
    try {
      return userCollectionRepo.findSummary()
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('getUserCollectionCards', async (_event, collectionId: string) => {
    try {
      return userCollectionRepo.findByCollection(collectionId)
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('addCardToCollection', async (_event, entry: AddCardDTO) => {
    try {
      userCollectionRepo.addOrIncrement(entry.cardId, entry.productUnitId)
    } catch (err) {
      throw err
    }
  })
}
