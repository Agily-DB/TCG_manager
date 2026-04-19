import { ipcMain } from 'electron'
import { deckRepo } from '../db'
import type { UpdateDeckDTO } from '../../shared/types'

export function registerDecksHandlers(): void {
  ipcMain.handle('createDeck', async (_event, name: string) => {
    try {
      return deckRepo.create(name)
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('getDecks', async () => {
    try {
      return deckRepo.findAll()
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('getDeckById', async (_event, id: string) => {
    try {
      return deckRepo.findById(id)
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('updateDeck', async (_event, id: string, data: UpdateDeckDTO) => {
    try {
      deckRepo.update(id, data)
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('deleteDeck', async (_event, id: string) => {
    try {
      deckRepo.delete(id)
    } catch (err) {
      throw err
    }
  })
}
