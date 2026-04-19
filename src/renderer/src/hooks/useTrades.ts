import { useQuery } from '@tanstack/react-query'

export function useTrades() {
  return useQuery({ queryKey: ['trades'], queryFn: () => window.electron.getTrades() })
}

export function useTradeDetail(id: string) {
  return useQuery({
    queryKey: ['trade', id],
    queryFn: () => window.electron.getTradeById(id),
    enabled: !!id,
  })
}
