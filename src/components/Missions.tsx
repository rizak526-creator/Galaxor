type MissionsProps = {
  level: number
  canClaimDaily: boolean
  dailyReward: number
  dailyCooldown: string
  missionTapDone: boolean
  missionTapProgress: number
  missionTapClaimed: boolean
  missionTapReward: number
  missionCrystalsDone: boolean
  missionCrystalsProgress: number
  missionCrystalsClaimed: boolean
  missionCrystalsEnergyReward: number
  missionUpgradesDone: boolean
  missionUpgradesProgress: number
  missionUpgradesClaimed: boolean
  missionUpgradesReward: number
  onClaimDaily: () => void
  onClaimTapMission: () => void
  onClaimCrystalsMission: () => void
  onClaimUpgradesMission: () => void
}

type MissionRowProps = {
  title: string
  reward: string
  progress: string
  canClaim: boolean
  claimed: boolean
  onClaim: () => void
}

function MissionRow({
  title,
  reward,
  progress,
  canClaim,
  claimed,
  onClaim,
}: MissionRowProps) {
  return (
    <article className="rounded-xl border border-white/10 bg-slate-900/50 p-3">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-300">Награда: {reward}</p>
      <p className="mt-1 text-xs text-cyan-200">Прогресс: {progress}</p>
      <button
        type="button"
        disabled={!canClaim || claimed}
        onClick={onClaim}
        className="mt-3 w-full rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
      >
        {claimed ? 'Получено' : 'Забрать награду'}
      </button>
    </article>
  )
}

export function Missions({
  level,
  canClaimDaily,
  dailyReward,
  dailyCooldown,
  missionTapDone,
  missionTapProgress,
  missionTapClaimed,
  missionTapReward,
  missionCrystalsDone,
  missionCrystalsProgress,
  missionCrystalsClaimed,
  missionCrystalsEnergyReward,
  missionUpgradesDone,
  missionUpgradesProgress,
  missionUpgradesClaimed,
  missionUpgradesReward,
  onClaimDaily,
  onClaimTapMission,
  onClaimCrystalsMission,
  onClaimUpgradesMission,
}: MissionsProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
      <h2 className="text-base font-semibold text-white">Миссии</h2>
      <p className="mt-1 text-xs text-slate-300">Ежедневный набор задач для уровня {level}</p>

      <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-100/10 p-3">
        <p className="text-sm font-medium text-amber-200">
          Ежедневный бонус: +{dailyReward} кристаллов
        </p>
        <p className="mt-1 text-xs text-amber-100">
          До следующего бонуса: {dailyCooldown}
        </p>
        <button
          type="button"
          onClick={onClaimDaily}
          disabled={!canClaimDaily}
          className="mt-3 w-full rounded-lg bg-amber-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          Забрать ежедневный бонус
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <MissionRow
          title="Сделай 200 тапов"
          reward={`+${missionTapReward} кристаллов`}
          progress={`${Math.min(missionTapProgress, 200)} / 200`}
          canClaim={missionTapDone}
          claimed={missionTapClaimed}
          onClaim={onClaimTapMission}
        />
        <MissionRow
          title="Накопи 500 кристаллов"
          reward={`+${missionCrystalsEnergyReward} энергия`}
          progress={`${Math.min(missionCrystalsProgress, 500)} / 500`}
          canClaim={missionCrystalsDone}
          claimed={missionCrystalsClaimed}
          onClaim={onClaimCrystalsMission}
        />
        <MissionRow
          title="Купи 2 улучшения"
          reward={`+${missionUpgradesReward} кристаллов`}
          progress={`${Math.min(missionUpgradesProgress, 2)} / 2`}
          canClaim={missionUpgradesDone}
          claimed={missionUpgradesClaimed}
          onClaim={onClaimUpgradesMission}
        />
      </div>
    </section>
  )
}
