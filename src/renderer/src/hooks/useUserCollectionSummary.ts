import { useQuery } from '@tanstack/react-query'

export function useUserCollectionSummary() {
  return useQuery({
    queryKey: ['userCollectionSummary'],
    queryFn: () => window.electron.getUserCollectionSummary(),
  })
}
