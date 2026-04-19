import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { ImportProgress } from '@shared/types'

export function useImportStatus() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<ImportProgress | null>(null)

  const syncStatus = useQuery({
    queryKey: ['syncStatus'],
    queryFn: () => window.electron.getSyncStatus(),
    refetchInterval: 3000,
  })

  useEffect(() => {
    const unsubscribe = window.electron.onImportProgress((p) => {
      setProgress(p)
      queryClient.invalidateQueries({ queryKey: ['syncStatus'] })
    })
    return unsubscribe
  }, [queryClient])

  return { syncStatus, progress }
}
