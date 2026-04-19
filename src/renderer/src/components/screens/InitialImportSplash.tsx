import { useEffect, useState } from 'react'
import { useImportStatus } from '../../hooks/useImportStatus'
import ProgressBar from '../ui/ProgressBar'

interface InitialImportSplashProps {
  onDismiss: () => void
}

export default function InitialImportSplash({ onDismiss }: InitialImportSplashProps) {
  const { progress } = useImportStatus()
  const [logs, setLogs] = useState<string[]>(['Iniciando...'])

  // Append log entries as progress updates come in
  useEffect(() => {
    if (progress?.collectionName) {
      setLogs((prev) => {
        const entry = `[${progress.current}/${progress.total}] ${progress.collectionName}`
        if (prev[prev.length - 1] === entry) return prev
        return [...prev.slice(-4), entry] // keep last 5 lines
      })
    }
  }, [progress])

  // Auto-dismiss 2s after import completes
  useEffect(() => {
    if (progress && progress.total > 0 && progress.current >= progress.total) {
      const timer = setTimeout(onDismiss, 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [progress, onDismiss])

  const isComplete = progress && progress.total > 0 && progress.current >= progress.total

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-pokedex-black">
      {/* Decorative Pokédex circle */}
      <div className="relative mb-8">
        <div className="w-32 h-32 rounded-full border-4 border-pokedex-yellow flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-4 border-pokedex-red flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-pokedex-yellow" />
          </div>
        </div>
        <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-pokedex-blue" />
        <div className="absolute top-2 left-8 w-3 h-3 rounded-full bg-pokedex-yellow" />
        <div className="absolute top-2 left-14 w-3 h-3 rounded-full bg-status-completed" />
      </div>

      <h1 className="font-mono text-pokedex-yellow text-4xl font-bold tracking-widest mb-2">
        POKÉDEX TCG
      </h1>
      <p className="font-mono text-pokedex-gray text-sm tracking-wider mb-8">
        GERENCIADOR DE COLEÇÃO
      </p>

      <div className="w-full max-w-md px-8">
        {isComplete ? (
          <p className="font-mono text-status-completed text-center text-sm mb-4">
            ✓ IMPORTAÇÃO CONCLUÍDA
          </p>
        ) : (
          <p className="font-mono text-pokedex-yellow text-center text-sm mb-4 animate-pulse">
            Importando dados da PokémonTCG API...
          </p>
        )}

        {progress && progress.total > 0 && (
          <ProgressBar
            current={progress.current}
            total={progress.total}
            label={progress.collectionName}
          />
        )}

        {!progress && (
          <div className="w-full h-3 bg-pokedex-panel rounded-full overflow-hidden">
            <div className="h-full bg-pokedex-yellow animate-pulse" style={{ width: '30%' }} />
          </div>
        )}

        {/* Activity log */}
        <div className="mt-4 bg-pokedex-panel rounded p-3 h-24 overflow-hidden">
          {logs.map((line, i) => (
            <p
              key={i}
              className={`font-mono text-xs ${i === logs.length - 1 ? 'text-pokedex-white' : 'text-pokedex-gray'}`}
            >
              {line}
            </p>
          ))}
        </div>
      </div>

      <button
        onClick={onDismiss}
        className="mt-8 font-mono text-pokedex-black bg-pokedex-yellow px-6 py-2 rounded text-sm font-bold tracking-widest hover:bg-yellow-300 transition-colors"
      >
        USAR AGORA
      </button>
    </div>
  )
}
