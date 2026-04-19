import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PokeButton } from '../../components/ui'
import type { Card } from '@shared/types'

interface GivenCard {
  card: Card
}

interface ReceivedCard {
  cardName: string
  cardNumber: string
  collectionName: string
  cardId?: string
}

export default function TradeForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [givenCards, setGivenCards] = useState<GivenCard[]>([])
  const [receivedCards, setReceivedCards] = useState<ReceivedCard[]>([])

  // Given search
  const [givenSearch, setGivenSearch] = useState('')
  const [givenResults, setGivenResults] = useState<Card[]>([])
  const givenRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Received form
  const [rcvName, setRcvName] = useState('')
  const [rcvNumber, setRcvNumber] = useState('')
  const [rcvCollection, setRcvCollection] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (givenRef.current) clearTimeout(givenRef.current)
    if (!givenSearch) { setGivenResults([]); return }
    givenRef.current = setTimeout(async () => {
      const results = await window.electron.getCards({ search: givenSearch })
      setGivenResults(results.slice(0, 15))
    }, 300)
    return () => { if (givenRef.current) clearTimeout(givenRef.current) }
  }, [givenSearch])

  function addGiven(card: Card) {
    if (!givenCards.find((g) => g.card.id === card.id)) {
      setGivenCards((prev) => [...prev, { card }])
    }
    setGivenSearch('')
    setGivenResults([])
  }

  function removeGiven(cardId: string) {
    setGivenCards((prev) => prev.filter((g) => g.card.id !== cardId))
  }

  function addReceived() {
    if (!rcvName) return
    setReceivedCards((prev) => [
      ...prev,
      { cardName: rcvName, cardNumber: rcvNumber, collectionName: rcvCollection },
    ])
    setRcvName('')
    setRcvNumber('')
    setRcvCollection('')
  }

  function removeReceived(idx: number) {
    setReceivedCards((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleConfirm() {
    if (givenCards.length === 0 && receivedCards.length === 0) {
      setError('Adicione ao menos uma carta')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await window.electron.createTrade({
        tradedAt: new Date().toISOString(),
        given: givenCards.map((g) => ({ cardId: g.card.id })),
        received: receivedCards.map((r) => ({
          cardName: r.cardName,
          cardNumber: r.cardNumber || undefined,
          collectionName: r.collectionName || undefined,
        })),
      })
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['userCollectionSummary'] })
      navigate('/trades')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao registrar troca')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="font-mono text-pokedex-yellow text-sm uppercase tracking-widest">
        Registrar Troca
      </h2>

      {error && (
        <p className="font-mono text-red-400 text-xs bg-pokedex-panel rounded p-2">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Given column */}
        <div className="space-y-3">
          <p className="font-mono text-pokedex-red text-xs uppercase tracking-widest">
            Cartas Cedidas ({givenCards.length})
          </p>
          <div className="relative">
            <input
              className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
              placeholder="Buscar na sua coleção..."
              value={givenSearch}
              onChange={(e) => setGivenSearch(e.target.value)}
            />
            {givenResults.length > 0 && (
              <div className="absolute z-10 w-full bg-pokedex-black border border-pokedex-panel rounded mt-1 max-h-40 overflow-y-auto">
                {givenResults.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className="w-full flex items-center gap-2 p-2 hover:bg-pokedex-panel text-left"
                    onClick={() => addGiven(card)}
                  >
                    {card.imageSmall && (
                      <img src={card.imageSmall} alt={card.name} className="w-6 h-6 object-contain" />
                    )}
                    <span className="font-mono text-pokedex-white text-xs">{card.name}</span>
                    <span className="font-mono text-pokedex-gray text-xs">#{card.number}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1">
            {givenCards.map(({ card }) => (
              <div key={card.id} className="flex items-center gap-2 bg-pokedex-panel rounded p-2">
                {card.imageSmall && (
                  <img src={card.imageSmall} alt={card.name} className="w-6 h-6 object-contain" />
                )}
                <span className="font-mono text-pokedex-white text-xs flex-1 truncate">{card.name}</span>
                <button
                  type="button"
                  className="font-mono text-red-400 text-xs"
                  onClick={() => removeGiven(card.id)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Received column */}
        <div className="space-y-3">
          <p className="font-mono text-green-400 text-xs uppercase tracking-widest">
            Cartas Recebidas ({receivedCards.length})
          </p>
          <div className="space-y-2">
            <input
              className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
              placeholder="Nome da carta *"
              value={rcvName}
              onChange={(e) => setRcvName(e.target.value)}
            />
            <input
              className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
              placeholder="Número (ex: 001/198)"
              value={rcvNumber}
              onChange={(e) => setRcvNumber(e.target.value)}
            />
            <input
              className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
              placeholder="Coleção"
              value={rcvCollection}
              onChange={(e) => setRcvCollection(e.target.value)}
            />
            <PokeButton variant="secondary" onClick={addReceived} disabled={!rcvName} className="w-full text-xs">
              + Adicionar
            </PokeButton>
          </div>
          <div className="space-y-1">
            {receivedCards.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-pokedex-panel rounded p-2">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-pokedex-white text-xs truncate">{r.cardName}</p>
                  {r.cardNumber && (
                    <p className="font-mono text-pokedex-gray text-xs">#{r.cardNumber}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="font-mono text-red-400 text-xs"
                  onClick={() => removeReceived(idx)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PokeButton onClick={handleConfirm} disabled={submitting} className="w-full">
        {submitting ? 'REGISTRANDO...' : 'Confirmar Troca'}
      </PokeButton>
    </div>
  )
}
