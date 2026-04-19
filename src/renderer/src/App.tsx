import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import PokedexShell from './components/layout/PokedexShell'
import {
  Dashboard,
  PurchaseForm,
  PurchaseList,
  ProductUnitOpening,
  CardLibrary,
  DeckList,
  DeckBuilder,
  TradeForm,
  TradeList,
  Settings,
} from './components/screens'
import InitialImportSplash from './components/screens/InitialImportSplash'

const PurchaseDetail = () => <div className="p-6 font-mono text-pokedex-yellow">DETALHE DA COMPRA</div>

export default function App() {
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    // Listen for db-empty event from main process (first ever launch)
    const unsubscribe = window.electron.onDbEmpty(() => {
      setShowSplash(true)
      window.electron.startInitialImport()
    })

    // On mount: check if import needs to run or resume
    window.electron.getSyncStatus().then((status) => {
      if (status.isRunning) {
        // Actively running right now — show splash
        setShowSplash(true)
      } else if (status.hasFailed && !status.lastSyncAt) {
        // Failed and never completed — resume
        setShowSplash(true)
        window.electron.startInitialImport()
      }
      // lastSyncAt exists → completed, do nothing
      // hasFailed but lastSyncAt exists → partial failure after a complete run, ignore
    })

    return unsubscribe
  }, [])

  return (
    <>
      {showSplash && <InitialImportSplash onDismiss={() => setShowSplash(false)} />}
      <Routes>
        <Route path="/" element={<PokedexShell />}>
          <Route index element={<Dashboard />} />
          <Route path="purchases" element={<PurchaseList />} />
          <Route path="purchases/new" element={<PurchaseForm />} />
          <Route path="purchases/:id" element={<PurchaseDetail />} />
          <Route path="opening/:unitId" element={<ProductUnitOpening />} />
          <Route path="library" element={<CardLibrary />} />
          <Route path="decks" element={<DeckList />} />
          <Route path="decks/new" element={<DeckBuilder />} />
          <Route path="decks/:id" element={<DeckBuilder />} />
          <Route path="trades" element={<TradeList />} />
          <Route path="trades/new" element={<TradeForm />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  )
}
