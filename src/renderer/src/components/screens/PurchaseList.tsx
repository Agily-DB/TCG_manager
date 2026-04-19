import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePurchases, usePurchaseDetail } from '../../hooks'
import { StatusBadge, PokeButton } from '../../components/ui'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function PurchaseDetailRow({ id }: { id: string }) {
  const { data, isLoading } = usePurchaseDetail(id)

  if (isLoading) return (
    <tr><td colSpan={5} className="p-2 font-mono text-pokedex-yellow text-xs animate-pulse">CARREGANDO...</td></tr>
  )
  if (!data) return null

  return (
    <>
      <tr className="bg-pokedex-black/30">
        <td colSpan={5} className="px-4 py-2">
          <p className="font-mono text-pokedex-gray text-xs mb-2 uppercase tracking-widest">
            Product Units ({data.productUnits.length})
          </p>
          <div className="space-y-1">
            {data.productUnits.map((unit) => (
              <div key={unit.id} className="flex items-center gap-3">
                <span className="font-mono text-pokedex-white text-xs">#{unit.id.slice(0, 8)}</span>
                <StatusBadge status={unit.openingStatus} />
                {unit.completedAt && (
                  <span className="font-mono text-pokedex-gray text-xs">
                    Concluído: {new Date(unit.completedAt).toLocaleDateString('pt-BR')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </td>
      </tr>
    </>
  )
}

export default function PurchaseList() {
  const navigate = useNavigate()
  const { data: purchases, isLoading } = usePurchases()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) {
    return <p className="font-mono text-pokedex-yellow animate-pulse p-6">CARREGANDO...</p>
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-pokedex-yellow text-sm uppercase tracking-widest">
          Histórico de Compras
        </h2>
        <PokeButton variant="primary" onClick={() => navigate('/purchases/new')}>
          + Nova Compra
        </PokeButton>
      </div>

      {!purchases || purchases.length === 0 ? (
        <p className="font-mono text-pokedex-gray">NENHUMA COMPRA REGISTRADA</p>
      ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-pokedex-gray text-xs border-b border-pokedex-panel">
              <th className="p-2">TIPO</th>
              <th className="p-2">COLEÇÃO</th>
              <th className="p-2">QTD</th>
              <th className="p-2">TOTAL</th>
              <th className="p-2">DATA</th>
            </tr>
          </thead>
          <tbody>
            {[...purchases].sort(
              (a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
            ).map((purchase) => (
              <>
                <tr
                  key={purchase.id}
                  className="bg-pokedex-panel hover:bg-pokedex-black/50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === purchase.id ? null : purchase.id)}
                >
                  <td className="p-2 font-mono text-pokedex-white text-xs">{purchase.productType}</td>
                  <td className="p-2 font-mono text-pokedex-gray text-xs">{purchase.collectionId}</td>
                  <td className="p-2 font-mono text-pokedex-white text-xs text-center">{purchase.quantity}</td>
                  <td className="p-2 font-mono text-pokedex-yellow text-xs">
                    {formatBRL(purchase.unitPrice * purchase.quantity)}
                  </td>
                  <td className="p-2 font-mono text-pokedex-gray text-xs">
                    {new Date(purchase.purchasedAt).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
                {expandedId === purchase.id && (
                  <PurchaseDetailRow key={`detail-${purchase.id}`} id={purchase.id} />
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
