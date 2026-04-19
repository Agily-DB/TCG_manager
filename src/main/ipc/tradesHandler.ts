import { ipcMain } from 'electron'
import { tradeRepo } from '../db'
import type { CreateTradeDTO } from '../../shared/types'

export function registerTradesHandlers(): void {
  ipcMain.handle('createTrade', async (_event, data: CreateTradeDTO) => {
    try {
      return tradeRepo.create(data)
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('getTrades', async () => {
    try {
      return tradeRepo.findAll()
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('getTradeById', async (_event, id: string) => {
    try {
      return tradeRepo.findById(id)
    } catch (err) {
      throw err
    }
  })
}
