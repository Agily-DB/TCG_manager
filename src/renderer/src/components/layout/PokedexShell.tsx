import { Outlet } from 'react-router-dom'
import PokedexEye from './PokedexEye'
import LeftPanel from './LeftPanel'

export default function PokedexShell() {
  return (
    <div className="h-screen flex flex-col bg-pokedex-black">
      {/* Header */}
      <header className="bg-pokedex-red flex items-center gap-4 px-4 py-3 shrink-0">
        <PokedexEye />
        <span className="font-mono text-pokedex-yellow text-xl font-bold tracking-widest">
          POKÉDEX TCG
        </span>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-56 bg-pokedex-darkred flex flex-col shrink-0">
          <div className="flex-1 overflow-y-auto">
            <LeftPanel />
          </div>
          {/* Decorative joystick buttons */}
          <div className="flex justify-center gap-3 p-4">
            <div className="w-5 h-5 rounded-full bg-pokedex-red border-2 border-red-900" />
            <div className="w-5 h-5 rounded-full bg-pokedex-yellow border-2 border-yellow-600" />
            <div className="w-5 h-5 rounded-full bg-pokedex-blue border-2 border-blue-900" />
          </div>
        </aside>

        {/* Right panel */}
        <main className="flex-1 bg-pokedex-black overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
