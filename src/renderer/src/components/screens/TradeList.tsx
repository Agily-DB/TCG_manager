import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrades, useTradeDetail } from '../../hooks'
import { PokeButton } from '../../components/ui'

function TradeDetailRow({ id }: { id: string }) {
  const { data, isLoading } = useTradeDetail(id)
  if (isLoading) return (
    <tr><td colSpan={3} className="p-2 font-mono text-pokedex-yellow text-xs animate-pulse">CARREGANDO...</td></tr>
  )
  if (!data) return null
  return (
    <tr className="bg-pokedex-black/30">
      <td colSpan={3} className="px-4 py-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-mono text-pokedex-red text-xs uppercase mb-1">Cedidas ({data.given.length})</p>
            {data.given.map((tc) => (
              <p key={tc.id} className="font-mono text-pokedex-white text-xs">
                {tc.card?.name ?? tc.cardName ?? '—'}
              </p>
            ))}
          </div>
          <div>
            <p className="font-mono text-green-400 text-xs uppercase mb-1">Recebidas ({data.received.length})</p>
            {data.received.map((tc) => (
              <p key={tc.id} className="font-mono text-pokedex-white text-xs">
                {tc.card?.name ?? tc.cardName ?? '—'}
              </p>
            ))}
          </div>
        </div>
      </td>
    </tr>
  )
}

export default function TradeList() {
  const navigate = useNavigate()
  const { data: trades, isLoading } = useTrades()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) return <p className="font-mono text-pokedex-yellow animate-pulse p-6">CARREGANDO...</p>

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-pokedex-yellow text-sm uppercase tracking-widest">
          Histórico de Trocas
        </h2>
        <PokeButton variant="primary" onClick={() => navigate('/trades/new')}>
          + Nova Troca
        </PokeButton>
      </div>

      {!trades || trades.length === 0 ? (
        <p className="font-mono text-pokedex-gray">NENHUMA TROCA REGISTRADA</p>
      ) : (
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left font-mono text-pokedex-gray text-xs border-b border-pokedex-panel">
            <th className="p-2">DATA</th>
            <th className="p-2">NOTAS</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <>
              <tr
                key={trade.id}
                className="bg-pokedex-panel hover:bg-pokedex-black/50 cursor-pointer transition-colors"
                onClick={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
              >
                <td className="p-2 font-mono text-pokedex-white text-xs">
                  {new Date(trade.tradedAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-2 font-mono text-pokedex-gray text-xs">{trade.notes ?? '—'}</td>
                <td className="p-2 font-mono text-pokedex-yellow text-xs">
                  {expandedId === trade.id ? '▲' : '▼'}
                </td>
              </tr>
              {expandedId === trade.id && (
                <TradeDetailRow key={`detail-${trade.id}`} id={trade.id} />
              )}
            </>
          ))}
        </tbody>
      </table>
      )}
    </div>
  )
}
