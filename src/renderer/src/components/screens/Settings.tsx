import { useImportStatus } from '../../hooks'
import { PokeButton, ProgressBar } from '../../components/ui'

export default function Settings() {
  const { syncStatus, progress } = useImportStatus()
  const { data: status, isLoading, error } = syncStatus

  return (
    <div className="p-4 space-y-6 max-w-lg">
      <h2 className="font-mono text-pokedex-yellow text-sm uppercase tracking-widest">
        Configurações
      </h2>

      {/* Sync status */}
      <div className="bg-pokedex-panel rounded p-4 space-y-3">
        <p className="font-mono text-pokedex-gray text-xs uppercase tracking-widest">Status do Banco</p>

        {isLoading && (
          <p className="font-mono text-pokedex-yellow text-xs animate-pulse">CARREGANDO...</p>
        )}

        {error && (
          <p className="font-mono text-red-400 text-xs">
            API indisponível: {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        )}

        {status && (
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-pokedex-gray">Último sync</span>
              <span className="text-pokedex-white">
                {status.lastSyncAt
                  ? new Date(status.lastSyncAt).toLocaleString('pt-BR')
                  : 'Nunca'}
              </span>
            </div>
            <div className="flex justify-between font-mono text-xs">
              <span className="text-pokedex-gray">Status</span>
              <span className={status.isRunning ? 'text-pokedex-yellow animate-pulse' : 'text-green-400'}>
                {status.isRunning ? 'EM EXECUÇÃO' : 'OCIOSO'}
              </span>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {progress && (
          <ProgressBar
            current={progress.current}
            total={progress.total}
            label={progress.collectionName}
          />
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <PokeButton
          onClick={() => window.electron.startSync()}
          disabled={status?.isRunning}
          className="w-full"
          variant="secondary"
        >
          Sincronizar agora
        </PokeButton>
        <PokeButton
          onClick={() => window.electron.startInitialImport()}
          disabled={status?.isRunning}
          className="w-full"
          variant="primary"
        >
          Importação inicial
        </PokeButton>
      </div>
    </div>
  )
}
