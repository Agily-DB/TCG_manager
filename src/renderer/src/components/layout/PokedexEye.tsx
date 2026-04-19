export default function PokedexEye() {
  return (
    <div className="flex items-center gap-2">
      {/* Main eye circle */}
      <div className="w-10 h-10 rounded-full bg-white border-4 border-pokedex-blue flex items-center justify-center">
        <div className="w-5 h-5 rounded-full bg-pokedex-blue flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white" />
        </div>
      </div>
      {/* Small decorative circles */}
      <div className="flex gap-1">
        <div className="w-3 h-3 rounded-full bg-red-400 border border-red-600" />
        <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600" />
        <div className="w-3 h-3 rounded-full bg-green-400 border border-green-600" />
      </div>
    </div>
  )
}
