import type { UserCollectionEntry } from '@shared/types'

interface CardListItemProps {
  entry: UserCollectionEntry
}

function formatPrice(price?: number): string {
  if (price == null) return '—'
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function CardListItem({ entry }: CardListItemProps) {
  const { card, quantity, lastPrice, buyLink } = entry

  return (
    <tr className="bg-pokedex-panel hover:bg-pokedex-black/50 text-pokedex-white font-ui text-sm transition-colors">
      <td className="p-2">
        {card.imageSmall ? (
          <img src={card.imageSmall} alt={card.name} className="w-8 h-8 object-contain rounded" />
        ) : (
          <div className="w-8 h-8 bg-pokedex-gray rounded flex items-center justify-center text-xs">🃏</div>
        )}
      </td>
      <td className="p-2 font-mono">{card.name}</td>
      <td className="p-2 text-pokedex-gray">{card.number}</td>
      <td className="p-2 text-pokedex-gray">{card.collectionId}</td>
      <td className="p-2 text-center">{quantity}</td>
      <td className="p-2 text-pokedex-yellow font-mono">{formatPrice(lastPrice)}</td>
      <td className="p-2">
        {buyLink ? (
          <a
            href={buyLink}
            target="_blank"
            rel="noreferrer"
            className="text-pokedex-blue hover:underline font-mono text-xs"
          >
            Liga↗
          </a>
        ) : (
          <span className="text-pokedex-gray text-xs">—</span>
        )}
      </td>
    </tr>
  )
}
