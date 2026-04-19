import { useQuery } from '@tanstack/react-query'

export function useCollections() {
  return useQuery({ queryKey: ['collections'], queryFn: () => window.electron.getCollections() })
}
