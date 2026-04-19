interface ProgressBarProps {
  current: number
  total: number
  label?: string
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0

  return (
    <div className="w-full">
      <p className="font-mono text-pokedex-yellow text-sm mb-1">
        Importando coleção {current} de {total}{label ? `: ${label}` : ''}
      </p>
      <div className="w-full h-3 bg-pokedex-panel rounded-full overflow-hidden">
        <div
          className="h-full bg-pokedex-yellow transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
