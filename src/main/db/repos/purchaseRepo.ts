import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database'
import type { Purchase, PurchaseDetail, CreatePurchaseDTO } from '../../../shared/types'
import { collectionRepo } from './collectionRepo'
import { productUnitRepo } from './productUnitRepo'

function rowToPurchase(row: Record<string, unknown>): Purchase {
  return {
    id: row.id as string,
    productType: row.product_type as string,
    collectionId: row.collection_id as string,
    quantity: row.quantity as number,
    unitPrice: row.unit_price as number,
    purchasedAt: row.purchased_at as string,
  }
}

export const purchaseRepo = {
  create(data: CreatePurchaseDTO): Purchase {
    const db = getDatabase()
    const id = uuidv4()
    db.prepare(`
      INSERT INTO purchases (id, product_type, collection_id, quantity, unit_price, purchased_at)
      VALUES (@id, @productType, @collectionId, @quantity, @unitPrice, @purchasedAt)
    `).run({
      id,
      productType: data.productType,
      collectionId: data.collectionId,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      purchasedAt: data.purchasedAt,
    })
    return { id, ...data }
  },

  findAll(): Purchase[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM purchases ORDER BY purchased_at DESC').all() as Record<string, unknown>[]
    return rows.map(rowToPurchase)
  },

  findById(id: string): PurchaseDetail | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!row) return null

    const purchase = rowToPurchase(row)
    const collection = collectionRepo.findById(purchase.collectionId)
    const productUnits = productUnitRepo.findByPurchaseId(id)

    return {
      ...purchase,
      collection: collection!,
      productUnits,
    }
  },
}
