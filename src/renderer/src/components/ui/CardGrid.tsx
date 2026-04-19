import { useEffect, useState } from 'react'
import type { UserCollectionEntry } from '@shared/types'

interface CardGridProps {
  cards: UserCollectionEntry[]
}

export default function CardGrid({ cards }: CardGridProps) {
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setScanning(false), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-3">
      {cards.map((entry) => (
        <div
          key={entry.id}
          className={`relative rounded overflow-hidden bg-pokedex-panel ${scanning ? 'animate-pulse' : ''}`}
        >
          {entry.card.imageSmall ? (
            <img
              src={entry.card.imageSmall}
              alt={entry.card.name}
              className="w-full h-auto object-cover"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-pokedex-gray flex items-center justify-center text-pokedex-white text-2xl">
              🃏
            </div>
          )}
          {/* Quantity badge */}
          <span className="absolute top-1 right-1 bg-pokedex-red text-white font-mono text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {entry.quantity}
          </span>
        </div>
      ))}
    </div>
  )
}
