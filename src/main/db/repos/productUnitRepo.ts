import { v4 as uuidv4 } from 'uuid'
import { getDatabase } from '../database'
import type { ProductUnit, OpeningStatus } from '../../../shared/types'

function rowToProductUnit(row: Record<string, unknown>): ProductUnit {
  return {
    id: row.id as string,
    purchaseId: row.purchase_id as string,
    openingStatus: row.opening_status as OpeningStatus,
    startedAt: row.started_at as string | undefined,
    completedAt: row.completed_at as string | undefined,
  }
}

export const productUnitRepo = {
  create(purchaseId: string, n: number): ProductUnit[] {
    const db = getDatabase()
    const insert = db.prepare(`
      INSERT INTO product_units (id, purchase_id, opening_status)
      VALUES (@id, @purchaseId, 'Pending')
    `)
    const units: ProductUnit[] = []
    const insertMany = db.transaction(() => {
      for (let i = 0; i < n; i++) {
        const id = uuidv4()
        insert.run({ id, purchaseId })
        units.push({ id, purchaseId, openingStatus: 'Pending' })
      }
    })
    insertMany()
    return units
  },

  findByPurchaseId(purchaseId: string): ProductUnit[] {
    const db = getDatabase()
    const rows = db.prepare('SELECT * FROM product_units WHERE purchase_id = ?').all(purchaseId) as Record<string, unknown>[]
    return rows.map(rowToProductUnit)
  },

  findById(id: string): ProductUnit | null {
    const db = getDatabase()
    const row = db.prepare('SELECT * FROM product_units WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return row ? rowToProductUnit(row) : null
  },

  findPending(): ProductUnit[] {
    const db = getDatabase()
    const rows = db.prepare(
      "SELECT * FROM product_units WHERE opening_status IN ('Pending', 'In_Progress')"
    ).all() as Record<string, unknown>[]
    return rows.map(rowToProductUnit)
  },

  updateStatus(id: string, status: OpeningStatus): void {
    const db = getDatabase()
    const now = new Date().toISOString()
    if (status === 'In_Progress') {
      db.prepare("UPDATE product_units SET opening_status = ?, started_at = ? WHERE id = ?").run(status, now, id)
    } else if (status === 'Completed') {
      db.prepare("UPDATE product_units SET opening_status = ?, completed_at = ? WHERE id = ?").run(status, now, id)
    } else {
      db.prepare("UPDATE product_units SET opening_status = ? WHERE id = ?").run(status, id)
    }
  },
}
