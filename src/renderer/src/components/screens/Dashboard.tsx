import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserCollectionSummary, usePendingUnits, usePriceScraper } from '../../hooks'
import { StatusBadge, PokeButton } from '../../components/ui'

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: summaries, isLoading: loadingSummary } = useUserCollectionSummary()
  const { data: pending, isLoading: loadingPending } = usePendingUnits()
  const priceScraper = usePriceScraper()
  const [scrapeMsg, setScrapeMsg] = useState<{ id: string; msg: string } | null>(null)

  if (loadingSummary || loadingPending) {
    return <p className="font-mono text-pokedex-yellow animate-pulse p-8 text-base">CARREGANDO...</p>
  }

  function handleScrape(collectionId: string) {
    setScrapeMsg(null)
    priceScraper.mutate(collectionId, {
      onSuccess: (result) => {
        if (result.errors.length > 0) {
          setScrapeMsg({ id: collectionId, msg: `⚠ ${result.errors[0]}` })
        } else {
          setScrapeMsg({ id: collectionId, msg: `✓ ${result.updated} preços atualizados` })
        }
      },
      onError: (err) => {
        setScrapeMsg({ id: collectionId, msg: `✗ ${err instanceof Error ? err.message : 'Erro'}` })
      },
    })
  }

  return (
    <div className="p-6 space-y-8">
      {/* Collection cards */}
      <section>
        <h2 className="font-mono text-pokedex-yellow text-base mb-4 uppercase tracking-widest">
          Minhas Coleções
        </h2>
        {!summaries || summaries.length === 0 ? (
          <p className="font-mono text-pokedex-gray text-base">NENHUMA COLEÇÃO ENCONTRADA</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaries.map(({ collection, distinctCardCount, totalValue }) => (
              <div
                key={collection.id}
                className="bg-pokedex-panel rounded-lg p-5 border border-pokedex-black space-y-3"
              >
                {collection.logoUrl ? (
                  <img src={collection.logoUrl} alt={collection.name} className="h-10 object-contain" />
                ) : (
                  <p className="font-mono text-pokedex-white text-base font-bold">{collection.name}</p>
                )}
                <p className="font-mono text-pokedex-gray text-sm">{collection.name}</p>
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-pokedex-white">{distinctCardCount} cartas</span>
                  <span className="text-pokedex-yellow">{formatBRL(totalValue)}</span>
                </div>
                {scrapeMsg?.id === collection.id && (
                  <p className={`font-mono text-xs ${scrapeMsg.msg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                    {scrapeMsg.msg}
                  </p>
                )}
                <PokeButton
                  variant="secondary"
                  className="w-full text-sm"
                  disabled={priceScraper.isPending}
                  onClick={() => handleScrape(collection.id)}
                >
                  {priceScraper.isPending ? 'ATUALIZANDO...' : 'Atualizar Preços'}
                </PokeButton>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Pending units */}
      <section>
        <h2 className="font-mono text-pokedex-yellow text-base mb-4 uppercase tracking-widest">
          Pacotes Pendentes
        </h2>
        {!pending || pending.length === 0 ? (
          <p className="font-mono text-pokedex-gray text-sm">NENHUM PACOTE PENDENTE</p>
        ) : (
          <div className="space-y-3">
            {pending.map(({ productUnit, purchase }) => (
              <div
                key={productUnit.id}
                className="bg-pokedex-panel rounded p-4 flex items-center justify-between gap-4 border border-pokedex-black"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-mono text-pokedex-white text-sm truncate">
                    #{productUnit.id.slice(0, 8)}
                  </p>
                  <p className="font-mono text-pokedex-gray text-sm">
                    {purchase.productType} · {purchase.collectionId}
                  </p>
                  <p className="font-mono text-pokedex-gray text-xs">
                    {new Date(purchase.purchasedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <StatusBadge status={productUnit.openingStatus} />
                <PokeButton
                  variant="primary"
                  className="text-sm shrink-0"
                  onClick={() => navigate(`/opening/${productUnit.id}`)}
                >
                  Abrir
                </PokeButton>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
