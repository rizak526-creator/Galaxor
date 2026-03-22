type StatsProps = {
  crystals: number
  energy: number
  stardust: number
  level: number
  totalEarned: number
  passiveIncome: number
  walletAddress: string
  levelProgress: number
  levelProgressTotal: number
  currentPlanetName: string
  currentPlanetPassive: number
  freeUpgradeTokens: number
  chapterTitle: string
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function Stats({
  crystals,
  energy,
  stardust,
  level,
  totalEarned,
  passiveIncome,
  walletAddress,
  levelProgress,
  levelProgressTotal,
  currentPlanetName,
  currentPlanetPassive,
  freeUpgradeTokens,
  chapterTitle,
}: StatsProps) {
  const progressPercent = Math.min(
    100,
    Math.floor((levelProgress / levelProgressTotal) * 100),
  )

  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-slate-900/60 p-4">
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <p className="stat-card">💎 Кристаллы: {formatNumber(crystals)}</p>
        <p className="stat-card">⚡ Энергия: {formatNumber(energy)}</p>
        <p className="stat-card">✨ Звёздная пыль: {formatNumber(stardust)}</p>
        <p className="stat-card">🛡 Уровень: {level}</p>
        <p className="stat-card col-span-2 sm:col-span-1">
          📈 Всего заработано: {formatNumber(totalEarned)}
        </p>
        <p className="stat-card col-span-2 sm:col-span-1">
          ⛏ Пассивно: +{formatNumber(passiveIncome)}/3 сек
        </p>
      </div>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
          <span>Прогресс уровня</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-700">
          <div
            className="h-2 rounded-full bg-cyan-300 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-cyan-200">
        Текущая планета: {currentPlanetName} — +{formatNumber(currentPlanetPassive)}x
        пассив
      </p>
      <p className="mt-1 text-xs text-amber-200">
        Бесплатные апгрейды (артефакты): {freeUpgradeTokens}
      </p>
      <p className="mt-1 text-xs text-fuchsia-200">Текущая глава: {chapterTitle}</p>
      <p className="mt-3 text-xs text-slate-300">Кошелёк: {walletAddress}</p>
    </section>
  )
}
