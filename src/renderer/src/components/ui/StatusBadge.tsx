import type { OpeningStatus } from '@shared/types'

interface StatusBadgeProps {
  status: OpeningStatus
}

const statusConfig: Record<OpeningStatus, { bg: string; text: string; label: string }> = {
  Pending: { bg: 'bg-status-pending', text: 'text-black', label: 'PENDENTE' },
  In_Progress: { bg: 'bg-status-in_progress', text: 'text-white', label: 'EM ANDAMENTO' },
  Completed: { bg: 'bg-status-completed', text: 'text-white', label: 'CONCLUÍDO' },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { bg, text, label } = statusConfig[status]
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-mono uppercase ${bg} ${text}`}>
      {label}
    </span>
  )
}
