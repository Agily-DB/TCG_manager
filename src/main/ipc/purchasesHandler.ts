import { ipcMain } from 'electron'
import { collectionRepo, purchaseRepo, productUnitRepo } from '../db'
import type { CreatePurchaseDTO, OpeningStatus } from '../../shared/types'

export function registerPurchasesHandlers(): void {
  ipcMain.handle('createPurchase', async (_event, data: CreatePurchaseDTO) => {
    try {
      const collection = collectionRepo.findById(data.collectionId)
      if (!collection) {
        throw new Error(`Collection not found: ${data.collectionId}`)
      }
      const purchase = purchaseRepo.create(data)
      productUnitRepo.create(purchase.id, data.quantity)
      return purchase
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('getPurchases', async () => {
    try {
      return purchaseRepo.findAll()
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('getPurchaseById', async (_event, id: string) => {
    try {
      return purchaseRepo.findById(id)
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('getProductUnit', async (_event, id: string) => {
    try {
      return productUnitRepo.findById(id)
    } catch (err) {
      throw err
    }
  })

  ipcMain.handle('updateProductUnitStatus', async (_event, id: string, status: OpeningStatus) => {
    try {
      productUnitRepo.updateStatus(id, status)
    } catch (err) {
      throw err
    }
  })
}
