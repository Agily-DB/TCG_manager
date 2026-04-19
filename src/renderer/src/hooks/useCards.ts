import { useQuery } from '@tanstack/react-query'
import type { CardFilter } from '@shared/types'

export function useCards(filter: CardFilter = {}) {
  return useQuery({ queryKey: ['cards', filter], queryFn: () => window.electron.getCards(filter) })
}
