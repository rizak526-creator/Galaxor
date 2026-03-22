type GameActionsProps = {
  onStart: () => void
}

export function GameActions({ onStart }: GameActionsProps) {
  return (
    <div className="mt-6">
      {/* Кнопка-заглушка для первого MVP экрана. */}
      <button
        type="button"
        onClick={onStart}
        className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        Начать игру
      </button>
      <p className="mt-3 text-center text-sm text-slate-300">
        В разработке: тапай по астероидам
      </p>
    </div>
  )
}
