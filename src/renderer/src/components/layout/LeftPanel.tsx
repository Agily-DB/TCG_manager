import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/purchases', label: 'Compras', icon: '📦' },
  { to: '/library', label: 'Biblioteca', icon: '📚' },
  { to: '/decks', label: 'Decks', icon: '🃏' },
  { to: '/trades', label: 'Trocas', icon: '🔄' },
  { to: '/settings', label: 'Configurações', icon: '⚙️' },
]

export default function LeftPanel() {
  return (
    <nav className="flex flex-col gap-1 p-2">
      {navItems.map(({ to, label, icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-3 rounded font-mono text-base transition-colors ${
              isActive
                ? 'bg-pokedex-red text-pokedex-yellow font-mono'
                : 'text-pokedex-white hover:bg-pokedex-red/50'
            }`
          }
        >
          <span className="text-xl">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
