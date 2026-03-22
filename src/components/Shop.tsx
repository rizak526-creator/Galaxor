type ShopProps = {
  crystals: number
  level: number
  costPassive: number
  costTap: number
  costEnergy: number
  costRare: number
  stardustChance: number
  onBuyPassive: () => void
  onBuyTap: () => void
  onBuyEnergy: () => void
  onBuyRare: () => void
}

type ShopCardProps = {
  title: string
  description: string
  cost: number
  canBuy: boolean
  isUnlocked: boolean
  lockText?: string
  onBuy: () => void
}

function ShopCard({
  title,
  description,
  cost,
  canBuy,
  isUnlocked,
  lockText,
  onBuy,
}: ShopCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-900/55 p-4">
      <h3 className="text-sm font-semibold text-cyan-200">{title}</h3>
      <p className="mt-2 text-xs text-slate-300">{description}</p>
      <p className="mt-3 text-xs text-amber-200">Стоимость: {cost} кристаллов</p>
      {!isUnlocked && (
        <p className="mt-1 text-xs text-rose-300">{lockText ?? 'Требуется более высокий уровень'}</p>
      )}
      <button
        type="button"
        disabled={!canBuy || !isUnlocked}
        onClick={onBuy}
        className="mt-3 w-full rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
      >
        Купить
      </button>
    </article>
  )
}

export function Shop({
  crystals,
  level,
  costPassive,
  costTap,
  costEnergy,
  costRare,
  stardustChance,
  onBuyPassive,
  onBuyTap,
  onBuyEnergy,
  onBuyRare,
}: ShopProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
      <h2 className="text-base font-semibold text-white">Магазин улучшений</h2>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ShopCard
          title="Ускорить пассив"
          description="+0.5 к passivePerTick и multiplier += 0.5"
          cost={costPassive}
          canBuy={crystals >= costPassive}
          isUnlocked
          onBuy={onBuyPassive}
        />
        <ShopCard
          title="Увеличить тап"
          description="tapPower + 1 к каждому тапу"
          cost={costTap}
          canBuy={crystals >= costTap}
          isUnlocked
          onBuy={onBuyTap}
        />
        <ShopCard
          title="Энергия бустер"
          description="energyMultiplier += 0.5 (энергия растёт быстрее)"
          cost={costEnergy}
          canBuy={crystals >= costEnergy}
          isUnlocked={level >= 3}
          lockText="Откроется на уровне 3"
          onBuy={onBuyEnergy}
        />
        <ShopCard
          title="Редкий дроп"
          description={`stardustChance +0.5% (сейчас ${stardustChance.toFixed(1)}%)`}
          cost={costRare}
          canBuy={crystals >= costRare}
          isUnlocked={level >= 6}
          lockText="Откроется на уровне 6"
          onBuy={onBuyRare}
        />
      </div>
    </section>
  )
}
