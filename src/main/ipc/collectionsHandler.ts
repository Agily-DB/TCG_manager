import { ipcMain } from 'electron'
import { collectionRepo, cardRepo } from '../db'
import type { CardFilter } from '../../shared/types'

export function registerCollectionsHandlers(): void {
  ipcMain.handle('getCollections', async () => {
    try {
      return collectionRepo.findAll()
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('getCards', async (_event, filter: CardFilter) => {
    try {
      return cardRepo.findByFilter(filter)
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('getCardById', async (_event, id: string) => {
    try {
      return cardRepo.findById(id)
    } catch (err) {
      throw err
    }
  })
}
