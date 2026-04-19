import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCards } from '../../hooks'
import { PokeButton } from '../../components/ui'
import type { Card } from '@shared/types'

interface SessionCard {
  card: Card
  addedAt: number
}

export default function ProductUnitOpening() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sessionCards, setSessionCards] = useState<SessionCard[]>([])
  const [flash, setFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  // Set status to In_Progress on mount
  useEffect(() => {
    if (!unitId) return
    window.electron.updateProductUnitStatus(unitId, 'In_Progress').catch(console.error)
  }, [unitId])

  const { data: cards = [] } = useCards({ search: debouncedSearch })
  const showResults = debouncedSearch.length > 0

  async function handleAddCard(card: Card) {
    if (!unitId) return
    setError(null)
    try {
      await window.electron.addCardToCollection({ cardId: card.id, productUnitId: unitId })
      setSessionCards((prev) => [{ card, addedAt: Date.now() }, ...prev])
      setSearch('')
      setDebouncedSearch('')
      // Flash animation
      setFlash(true)
      setTimeout(() => setFlash(false), 500)
      queryClient.invalidateQueries({ queryKey: ['userCollectionSummary'] })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar carta')
    }
  }

  async function handleComplete() {
    if (!unitId) return
    await window.electron.updateProductUnitStatus(unitId, 'Completed')
    queryClient.invalidateQueries({ queryKey: ['pendingUnits'] })
    navigate('/')
  }

  function handlePause() {
    navigate('/')
  }

  return (
    <div className="p-4 space-y-4 relative">
      {/* Flash overlay */}
      {flash && (
        <div className="fixed inset-0 bg-green-500/20 pointer-events-none z-50 transition-opacity" />
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-mono text-pokedex-yellow text-sm uppercase tracking-widest">
          Abrindo #{unitId?.slice(0, 8)}
        </h2>
        <div className="flex gap-2">
          <PokeButton variant="secondary" onClick={handlePause}>Pausar</PokeButton>
          <PokeButton onClick={handleComplete}>Concluir</PokeButton>
        </div>
      </div>

      {error && (
        <p className="font-mono text-red-400 text-xs bg-pokedex-panel rounded p-2">{error}</p>
      )}

      {/* Search */}
      <div className="relative">
        <input
          className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
          placeholder="Buscar carta por nome ou número..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {showResults && cards.length > 0 && (
          <div className="absolute z-10 w-full bg-pokedex-black border border-pokedex-panel rounded mt-1 max-h-48 overflow-y-auto">
            {cards.slice(0, 20).map((card) => (
              <button
                key={card.id}
                type="button"
                className="w-full flex items-center gap-2 p-2 hover:bg-pokedex-panel text-left"
                onClick={() => handleAddCard(card)}
              >
                {card.imageSmall ? (
                  <img src={card.imageSmall} alt={card.name} className="w-8 h-8 object-contain rounded" />
                ) : (
                  <div className="w-8 h-8 bg-pokedex-gray rounded flex items-center justify-center text-xs">🃏</div>
                )}
                <div>
                  <p className="font-mono text-pokedex-white text-xs">{card.name}</p>
                  <p className="font-mono text-pokedex-gray text-xs">#{card.number}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {showResults && cards.length === 0 && (
          <div className="absolute z-10 w-full bg-pokedex-black border border-pokedex-panel rounded mt-1 p-2">
            <p className="font-mono text-pokedex-gray text-xs">Nenhuma carta encontrada</p>
          </div>
        )}
      </div>

      {/* Session cards */}
      <div>
        <p className="font-mono text-pokedex-gray text-xs uppercase tracking-widest mb-2">
          Cartas registradas nesta sessão ({sessionCards.length})
        </p>
        {sessionCards.length === 0 ? (
          <p className="font-mono text-pokedex-gray text-xs">Nenhuma carta adicionada ainda</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
            {sessionCards.map(({ card, addedAt }) => (
              <div key={`${card.id}-${addedAt}`} className="relative rounded overflow-hidden bg-pokedex-panel">
                {card.imageSmall ? (
                  <img src={card.imageSmall} alt={card.name} className="w-full h-auto object-cover" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-pokedex-gray flex items-center justify-center text-xl">🃏</div>
                )}
                <p className="font-mono text-pokedex-white text-xs text-center truncate px-1 pb-1">
                  {card.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
