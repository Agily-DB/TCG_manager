import { useMutation, useQueryClient } from '@tanstack/react-query'

export function usePriceScraper() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (collectionId: string) => window.electron.scrapeCollectionPrices(collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userCollectionSummary'] })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
  })
}
