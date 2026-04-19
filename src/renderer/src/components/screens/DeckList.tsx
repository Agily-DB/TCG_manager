import { useNavigate } from 'react-router-dom'
import { useDecks } from '../../hooks'
import { PokeButton } from '../../components/ui'

export default function DeckList() {
  const navigate = useNavigate()
  const { data: decks, isLoading } = useDecks()

  if (isLoading) return <p className="font-mono text-pokedex-yellow animate-pulse p-6">CARREGANDO...</p>

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-mono text-pokedex-yellow text-sm uppercase tracking-widest">
          Meus Decks
        </h2>
        <PokeButton variant="primary" onClick={() => navigate('/decks/new')}>
          + Novo Deck
        </PokeButton>
      </div>

      {!decks || decks.length === 0 ? (
        <p className="font-mono text-pokedex-gray">NENHUM DECK CRIADO</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="bg-pokedex-panel rounded-lg p-4 border border-pokedex-black space-y-2 cursor-pointer hover:bg-pokedex-black/50 transition-colors"
              onClick={() => navigate(`/decks/${deck.id}`)}
            >
              <p className="font-mono text-pokedex-white text-sm font-bold">{deck.name}</p>
              <p className="font-mono text-pokedex-gray text-xs">
                Criado em {new Date(deck.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
