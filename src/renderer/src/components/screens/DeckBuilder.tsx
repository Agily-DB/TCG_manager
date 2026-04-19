import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useDeckDetail } from '../../hooks'
import { PokeButton } from '../../components/ui'
import type { Card } from '@shared/types'

interface DeckCard {
  card: Card
  quantity: number
}

const MAX_CARDS = 60
const MAX_COPIES = 4

export default function DeckBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: deckDetail } = useDeckDetail(id ?? '')

  const [deckName, setDeckName] = useState('Novo Deck')
  const [deckCards, setDeckCards] = useState<DeckCard[]>([])
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Card[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load existing deck
  useEffect(() => {
    if (deckDetail) {
      setDeckName(deckDetail.name)
      setDeckCards(deckDetail.cards.map(({ card, quantity }) => ({ card, quantity })))
    }
  }, [deckDetail])

  // Debounced search in user collection
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current)
    if (!search) { setSearchResults([]); return }
    searchRef.current = setTimeout(async () => {
      const results = await window.electron.getCards({ search })
      setSearchResults(results.slice(0, 20))
    }, 300)
    return () => { if (searchRef.current) clearTimeout(searchRef.current) }
  }, [search])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const totalCards = deckCards.reduce((sum, dc) => sum + dc.quantity, 0)

  function addCard(card: Card) {
    if (totalCards >= MAX_CARDS) {
      showToast(`Limite de ${MAX_CARDS} cartas atingido`)
      return
    }
    const existing = deckCards.find((dc) => dc.card.id === card.id)
    if (existing && existing.quantity >= MAX_COPIES) {
      showToast(`Limite de ${MAX_COPIES} cópias de "${card.name}" atingido`)
      return
    }
    setDeckCards((prev) => {
      const idx = prev.findIndex((dc) => dc.card.id === card.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 }
        return updated
      }
      return [...prev, { card, quantity: 1 }]
    })
    setSearch('')
    setSearchResults([])
  }

  function removeCard(cardId: string) {
    setDeckCards((prev) => {
      const idx = prev.findIndex((dc) => dc.card.id === cardId)
      if (idx < 0) return prev
      const updated = [...prev]
      if (updated[idx].quantity > 1) {
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity - 1 }
      } else {
        updated.splice(idx, 1)
      }
      return updated
    })
  }

  async function handleSave() {
    setSaving(true)
    try {
      const cards = deckCards.map((dc) => ({ cardId: dc.card.id, quantity: dc.quantity }))
      if (id) {
        await window.electron.updateDeck(id, { name: deckName, cards })
      } else {
        const deck = await window.electron.createDeck(deckName)
        await window.electron.updateDeck(deck.id, { cards })
      }
      queryClient.invalidateQueries({ queryKey: ['decks'] })
      navigate('/decks')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao salvar deck')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    if (!confirm('Excluir este deck?')) return
    await window.electron.deleteDeck(id)
    queryClient.invalidateQueries({ queryKey: ['decks'] })
    navigate('/decks')
  }

  return (
    <div className="flex h-full gap-0 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-pokedex-red text-white font-mono text-xs rounded px-3 py-2 shadow-lg">
          {toast}
        </div>
      )}

      {/* Left panel — search */}
      <div className="w-1/2 border-r border-pokedex-panel p-4 flex flex-col gap-3 overflow-y-auto">
        <p className="font-mono text-pokedex-gray text-xs uppercase tracking-widest">Buscar Cartas</p>
        <input
          className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
          placeholder="Nome ou número..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="space-y-1 flex-1 overflow-y-auto">
          {searchResults.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-2 bg-pokedex-panel rounded p-2 cursor-pointer hover:bg-pokedex-black/50"
              onClick={() => addCard(card)}
            >
              {card.imageSmall ? (
                <img src={card.imageSmall} alt={card.name} className="w-8 h-8 object-contain rounded" />
              ) : (
                <div className="w-8 h-8 bg-pokedex-gray rounded flex items-center justify-center text-xs">🃏</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-pokedex-white text-xs truncate">{card.name}</p>
                <p className="font-mono text-pokedex-gray text-xs">#{card.number}</p>
              </div>
              <span className="font-mono text-pokedex-yellow text-xs">+</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — deck */}
      <div className="w-1/2 p-4 flex flex-col gap-3 overflow-y-auto">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="font-mono text-xs">
            <span className={totalCards > MAX_CARDS ? 'text-red-400' : 'text-pokedex-yellow'}>
              {totalCards}
            </span>
            <span className="text-pokedex-gray">/{MAX_CARDS}</span>
          </p>
          <div className="flex gap-2">
            <PokeButton onClick={handleSave} disabled={saving} className="text-xs">
              {saving ? 'SALVANDO...' : 'Salvar'}
            </PokeButton>
            {id && (
              <PokeButton variant="danger" onClick={handleDelete} className="text-xs">
                Excluir
              </PokeButton>
            )}
          </div>
        </div>

        <div className="space-y-1 flex-1 overflow-y-auto">
          {deckCards.length === 0 ? (
            <p className="font-mono text-pokedex-gray text-xs">Nenhuma carta no deck</p>
          ) : (
            deckCards.map(({ card, quantity }) => (
              <div key={card.id} className="flex items-center gap-2 bg-pokedex-panel rounded p-2">
                <span className="font-mono text-pokedex-yellow text-xs w-5 text-center">{quantity}x</span>
                <p className="font-mono text-pokedex-white text-xs flex-1 truncate">{card.name}</p>
                <button
                  type="button"
                  className="font-mono text-red-400 text-xs hover:text-red-300"
                  onClick={() => removeCard(card.id)}
                >
                  −
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
