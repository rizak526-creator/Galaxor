import type { FleetShip } from './PlanetMap'

type ExpeditionRecord = {
  id: string
  shipId: string
  shipName: string
  durationHours: number
  endAt: number
  status: 'running' | 'ready' | 'claimed'
  reward: {
    crystals: number
    energy: number
    stardust: number
    artifact: boolean
  }
}

type ExpeditionProps = {
  ships: FleetShip[]
  expeditions: ExpeditionRecord[]
  selectedShipId: string
  selectedDuration: number
  onSelectShip: (shipId: string) => void
  onSelectDuration: (hours: number) => void
  onSendExpedition: () => void
  onClaimExpedition: (expeditionId: string) => void
}

function formatTimeLeft(endAt: number): string {
  const leftMs = Math.max(0, endAt - Date.now())
  const totalMinutes = Math.ceil(leftMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}ч ${minutes}м`
}

export function Expedition({
  ships,
  expeditions,
  selectedShipId,
  selectedDuration,
  onSelectShip,
  onSelectDuration,
  onSendExpedition,
  onClaimExpedition,
}: ExpeditionProps) {
  const runningExpeditions = expeditions.filter((item) => item.status === 'running')
  const readyExpeditions = expeditions.filter((item) => item.status === 'ready')
  const availableShips = ships.filter((ship) => ship.level > 0)

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
      <h2 className="text-base font-semibold text-white">Экспедиции</h2>
      <p className="mt-1 text-xs text-slate-300">
        Отправляй флот в дальний космос и забирай редкие награды.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-900/55 p-3">
          <p className="text-sm font-semibold text-cyan-200">Новая экспедиция</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {availableShips.length === 0 && (
              <p className="text-xs text-rose-300">
                Улучши хотя бы один корабль в вкладке "Флот".
              </p>
            )}
            {availableShips.map((ship) => (
              <button
                key={ship.id}
                type="button"
                onClick={() => onSelectShip(ship.id)}
                className={`tab-btn ${selectedShipId === ship.id ? 'tab-btn-active' : ''}`}
              >
                {ship.icon} {ship.name} Lv.{ship.level}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            {[2, 6, 12].map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => onSelectDuration(hours)}
                className={`tab-btn ${selectedDuration === hours ? 'tab-btn-active' : ''}`}
              >
                {hours}ч
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onSendExpedition}
            disabled={!selectedShipId}
            className="mt-3 w-full rounded-lg bg-indigo-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            Отправить экспедицию
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/55 p-3">
          <p className="text-sm font-semibold text-cyan-200">В процессе</p>
          {runningExpeditions.length === 0 ? (
            <p className="mt-2 text-xs text-slate-300">Активных экспедиций нет</p>
          ) : (
            <div className="mt-2 space-y-2">
              {runningExpeditions.map((item) => (
                <div key={item.id} className="rounded-lg border border-white/10 p-2">
                  <p className="text-xs text-white">
                    {item.shipName} • {item.durationHours}ч
                  </p>
                  <p className="text-xs text-slate-300">
                    До возвращения: {formatTimeLeft(item.endAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/55 p-3">
        <p className="text-sm font-semibold text-cyan-200">Вернувшиеся экспедиции</p>
        {readyExpeditions.length === 0 ? (
          <p className="mt-2 text-xs text-slate-300">Пока нет готовых наград</p>
        ) : (
          <div className="mt-2 space-y-2">
            {readyExpeditions.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 p-2">
                <p className="text-xs text-white">{item.shipName}</p>
                <p className="text-xs text-slate-300">
                  Награда: +{item.reward.crystals} крист., +{item.reward.energy} энергия,
                  +{item.reward.stardust} пыль
                  {item.reward.artifact ? ', артефакт' : ''}
                </p>
                <button
                  type="button"
                  onClick={() => onClaimExpedition(item.id)}
                  className="mt-2 w-full rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  Забрать награду
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export type { ExpeditionRecord }
