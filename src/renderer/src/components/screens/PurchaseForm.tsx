import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useCollections } from '../../hooks'
import { PokeButton } from '../../components/ui'
import type { ProductType } from '@shared/types'

const PRODUCT_TYPES: ProductType[] = [
  'Booster', 'Blister', 'ETB', 'Booster_Box', 'Tin', 'Starter_Deck', 'Bundle', 'Outro',
]

interface FormData {
  productType: ProductType
  customType: string
  collectionSearch: string
  collectionId: string
  quantity: number
  unitPrice: number
  purchasedAt: string
}

const today = new Date().toISOString().slice(0, 10)

export default function PurchaseForm() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: collections = [] } = useCollections()

  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState<FormData>({
    productType: 'Booster',
    customType: '',
    collectionSearch: '',
    collectionId: '',
    quantity: 1,
    unitPrice: 0,
    purchasedAt: today,
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const filteredCollections = useMemo(() => {
    const q = form.collectionSearch.toLowerCase()
    return q ? collections.filter((c) => c.name.toLowerCase().includes(q)) : collections.slice(0, 8)
  }, [collections, form.collectionSearch])

  const selectedCollection = collections.find((c) => c.id === form.collectionId)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleNext() {
    if (!form.collectionId) { setError('Selecione uma coleção'); return }
    if (form.quantity < 1) { setError('Quantidade mínima é 1'); return }
    if (form.unitPrice < 0) { setError('Valor inválido'); return }
    setError(null)
    setStep(2)
  }

  async function handleConfirm() {
    setSubmitting(true)
    setError(null)
    try {
      const productType = form.productType === 'Outro' ? form.customType || 'Outro' : form.productType
      const purchase = await window.electron.createPurchase({
        productType,
        collectionId: form.collectionId,
        quantity: form.quantity,
        unitPrice: form.unitPrice,
        purchasedAt: form.purchasedAt,
      })
      await queryClient.invalidateQueries({ queryKey: ['purchases'] })
      await queryClient.invalidateQueries({ queryKey: ['pendingUnits'] })
      const detail = await window.electron.getPurchaseById(purchase.id)
      const firstUnit = detail.productUnits[0]
      navigate(`/opening/${firstUnit.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar compra')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h2 className="font-mono text-pokedex-yellow text-sm uppercase tracking-widest">
        Nova Compra — Passo {step}/2
      </h2>

      {error && (
        <p className="font-mono text-red-400 text-xs bg-pokedex-panel rounded p-2">{error}</p>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {/* Product type */}
          <div>
            <label className="font-mono text-pokedex-gray text-xs block mb-1">TIPO DE PRODUTO</label>
            <select
              className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
              value={form.productType}
              onChange={(e) => set('productType', e.target.value as ProductType)}
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {form.productType === 'Outro' && (
            <div>
              <label className="font-mono text-pokedex-gray text-xs block mb-1">TIPO PERSONALIZADO</label>
              <input
                className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
                value={form.customType}
                onChange={(e) => set('customType', e.target.value)}
                placeholder="Ex: Coleção especial..."
              />
            </div>
          )}

          {/* Collection autocomplete */}
          <div>
            <label className="font-mono text-pokedex-gray text-xs block mb-1">COLEÇÃO</label>
            <input
              className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
              value={form.collectionSearch}
              onChange={(e) => { set('collectionSearch', e.target.value); set('collectionId', '') }}
              placeholder="Buscar coleção..."
            />
            {form.collectionSearch && !form.collectionId && (
              <div className="bg-pokedex-black border border-pokedex-panel rounded mt-1 max-h-40 overflow-y-auto">
                {filteredCollections.length === 0 ? (
                  <p className="font-mono text-pokedex-gray text-xs p-2">Nenhuma coleção encontrada</p>
                ) : (
                  filteredCollections.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left font-mono text-pokedex-white text-xs p-2 hover:bg-pokedex-panel"
                      onClick={() => { set('collectionId', c.id); set('collectionSearch', c.name) }}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedCollection && (
              <p className="font-mono text-pokedex-yellow text-xs mt-1">✓ {selectedCollection.name}</p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="font-mono text-pokedex-gray text-xs block mb-1">QUANTIDADE</label>
            <input
              type="number"
              min={1}
              className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
              value={form.quantity}
              onChange={(e) => set('quantity', parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Unit price */}
          <div>
            <label className="font-mono text-pokedex-gray text-xs block mb-1">VALOR UNITÁRIO (R$)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
              value={form.unitPrice}
              onChange={(e) => set('unitPrice', parseFloat(e.target.value) || 0)}
            />
          </div>

          {/* Date */}
          <div>
            <label className="font-mono text-pokedex-gray text-xs block mb-1">DATA DA COMPRA</label>
            <input
              type="date"
              className="w-full bg-pokedex-panel text-pokedex-white font-mono text-sm rounded p-2 border border-pokedex-black"
              value={form.purchasedAt}
              onChange={(e) => set('purchasedAt', e.target.value)}
            />
          </div>

          <PokeButton onClick={handleNext} className="w-full">Próximo →</PokeButton>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-pokedex-panel rounded p-4 space-y-2 font-mono text-sm">
            <p className="text-pokedex-gray text-xs uppercase tracking-widest mb-2">Resumo da Compra</p>
            <div className="flex justify-between">
              <span className="text-pokedex-gray">Tipo</span>
              <span className="text-pokedex-white">
                {form.productType === 'Outro' ? form.customType || 'Outro' : form.productType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-pokedex-gray">Coleção</span>
              <span className="text-pokedex-white">{selectedCollection?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-pokedex-gray">Quantidade</span>
              <span className="text-pokedex-white">{form.quantity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-pokedex-gray">Valor unit.</span>
              <span className="text-pokedex-yellow">
                {form.unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="flex justify-between border-t border-pokedex-black pt-2">
              <span className="text-pokedex-gray">Total</span>
              <span className="text-pokedex-yellow font-bold">
                {(form.unitPrice * form.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-pokedex-gray">Data</span>
              <span className="text-pokedex-white">
                {new Date(form.purchasedAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <PokeButton variant="secondary" onClick={() => setStep(1)} className="flex-1">
              ← Voltar
            </PokeButton>
            <PokeButton onClick={handleConfirm} disabled={submitting} className="flex-1">
              {submitting ? 'SALVANDO...' : 'Confirmar'}
            </PokeButton>
          </div>
        </div>
      )}
    </div>
  )
}
