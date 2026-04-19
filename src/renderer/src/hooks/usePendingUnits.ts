import { useQuery } from '@tanstack/react-query'
import type { ProductUnit, Purchase } from '@shared/types'

export interface PendingUnitEntry {
  productUnit: ProductUnit
  purchase: Purchase
}

export function usePendingUnits() {
  return useQuery({
    queryKey: ['pendingUnits'],
    queryFn: async (): Promise<PendingUnitEntry[]> => {
      const purchases = await window.electron.getPurchases()
      const details = await Promise.all(purchases.map((p) => window.electron.getPurchaseById(p.id)))
      const result: PendingUnitEntry[] = []
      for (const detail of details) {
        for (const unit of detail.productUnits) {
          if (unit.openingStatus === 'Pending' || unit.openingStatus === 'In_Progress') {
            result.push({ productUnit: unit, purchase: detail })
          }
        }
      }
      return result
    },
  })
}
