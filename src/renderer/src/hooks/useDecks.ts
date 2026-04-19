import { useQuery } from '@tanstack/react-query'

export function useDecks() {
  return useQuery({ queryKey: ['decks'], queryFn: () => window.electron.getDecks() })
}

export function useDeckDetail(id: string) {
  return useQuery({
    queryKey: ['deck', id],
    queryFn: () => window.electron.getDeckById(id),
    enabled: !!id,
  })
}
