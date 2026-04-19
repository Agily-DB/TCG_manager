import { useState, useEffect } from 'react'
import { useUIStore } from '../../store/uiStore'
import { useCollections } from '../../hooks'
import { PokeButton, CardGrid, CardListItem } from '../../components/ui'
import type { UserCollectionEntry } from '@shared/types'

export default function CardLibrary() {
  const { viewMode, setViewMode } = useUIStore()
  const { data: collections = [] } = useCollections()

  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [entries, setEntries] = useState<UserCollectionEntry[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        if (selectedCollectionId) {
          const data = await window.electron.getUserCollectionCards(selectedCollectionId)
          if (!cancelled) setEntries(data)
        } else {
          // Load all collections and concatenate
          const summaries = await window.electron.getUserCollectionSummary()
          const all: UserCollectionEntry[] = []
          await Promise.all(
            summaries.map(async ({ collection }) => {
              const data = await window.electron.getUserCollectionCards(collection.id)
              all.push(...data)
            })
          )
          if (!cancelled) setEntries(all)
        }
      } catch {
        if (!cancelled) setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedCollectionId])

  const filtered = search
    ? entries.filter(
        (e) =>
          e.card.name.toLowerCase().includes(search.toLowerCase()) ||
          e.card.number.toLowerCase().includes(search.toLowerCase())
      )
    : entries

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 p-4 border-b border-pokedex-panel">
        <h2 className="font-mono text-pokedex-yellow text-sm uppercase tracking-widest mr-2">
          Biblioteca
        </h2>

        {/* Collection filter */}
        <select
          className="bg-pokedex-panel text-pokedex-white font-mono text-xs rounded p-1.5 border border-pokedex-black"
          value={selectedCollectionId}
          onChange={(e) => setSelectedCollectionId(e.target.value)}
        >
          <option value="">Todas as coleções</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Search */}
        <input
          className="flex-1 min-w-32 bg-pokedex-panel text-pokedex-white font-mono text-xs rounded p-1.5 border border-pokedex-black"
          placeholder="Buscar por nome ou número..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* View toggle */}
        <div className="flex gap-1">
          <PokeButton
            variant={viewMode === 'grid' ? 'primary' : 'secondary'}
            className="text-xs px-2 py-1"
            onClick={() => setViewMode('grid')}
          >
            ⊞
          </PokeButton>
          <PokeButton
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            className="text-xs px-2 py-1"
            onClick={() => setViewMode('list')}
          >
            ☰
          </PokeButton>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="font-mono text-pokedex-yellow animate-pulse p-6">CARREGANDO...</p>
        ) : filtered.length === 0 ? (
          <p className="font-mono text-pokedex-gray p-6">NENHUMA CARTA ENCONTRADA</p>
        ) : viewMode === 'grid' ? (
          <CardGrid cards={filtered} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-pokedex-gray text-xs border-b border-pokedex-panel">
                <th className="p-2">IMG</th>
                <th className="p-2">NOME</th>
                <th className="p-2">Nº</th>
                <th className="p-2">COLEÇÃO</th>
                <th className="p-2">QTD</th>
                <th className="p-2">PREÇO</th>
                <th className="p-2">LIGA</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <CardListItem key={entry.id} entry={entry} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
