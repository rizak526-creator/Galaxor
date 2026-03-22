import type { FleetShip } from './PlanetMap'

type FleetProps = {
  crystals: number
  ships: FleetShip[]
  onUpgradeShip: (shipId: string) => void
  getShipCost: (shipId: string, level: number) => number
}

export function Fleet({
  crystals,
  ships,
  onUpgradeShip,
  getShipCost,
}: FleetProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
      <h2 className="text-base font-semibold text-white">Флот</h2>
      <p className="mt-1 text-xs text-slate-300">
        Улучшай корабли, чтобы ускорять добычу и открывать дальние миры.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {ships.map((ship) => {
          const cost = getShipCost(ship.id, ship.level)
          const canBuy = crystals >= cost
          return (
            <article
              key={ship.id}
              className="rounded-xl border border-white/10 bg-slate-900/55 p-3"
            >
              <p className="text-sm font-semibold text-cyan-200">
                {ship.icon} {ship.name}
              </p>
              <p className="mt-1 text-xs text-slate-300">Уровень: {ship.level}</p>
              <p className="mt-1 text-xs text-amber-200">Стоимость: {cost}</p>
              <button
                type="button"
                disabled={!canBuy}
                onClick={() => onUpgradeShip(ship.id)}
                className="mt-3 w-full rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                Улучшить
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
