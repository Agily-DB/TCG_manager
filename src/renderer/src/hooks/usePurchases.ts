import { useQuery } from '@tanstack/react-query'

export function usePurchases() {
  return useQuery({ queryKey: ['purchases'], queryFn: () => window.electron.getPurchases() })
}

export function usePurchaseDetail(id: string) {
  return useQuery({
    queryKey: ['purchase', id],
    queryFn: () => window.electron.getPurchaseById(id),
    enabled: !!id,
  })
}
