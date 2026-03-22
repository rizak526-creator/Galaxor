type StoryChoiceView = {
  id: string
  title: string
  outcome: string
}

type CosmeticView = {
  id: string
  name: string
  price: number
  description: string
  owned: boolean
}

type CommandCenterProps = {
  factionRep: {
    union: number
    syndicate: number
    keepers: number
  }
  storyTitle: string
  storyDescription: string
  storyChoices: StoryChoiceView[]
  onChooseStory: (choiceId: string) => void
  storyHistory: string[]
  passTier: number
  passMilestones: number[]
  passPremium: boolean
  passClaimedFree: number[]
  passClaimedPremium: number[]
  passPoints: number
  onUnlockPremium: () => void
  onClaimFree: (tier: number) => void
  onClaimPremium: (tier: number) => void
  stardust: number
  cosmetics: CosmeticView[]
  onBuyCosmetic: (id: string, price: number) => void
  uiDensity: 'compact' | 'comfortable'
  onToggleUiDensity: () => void
}

export function CommandCenter({
  factionRep,
  storyTitle,
  storyDescription,
  storyChoices,
  onChooseStory,
  storyHistory,
  passTier,
  passMilestones,
  passPremium,
  passClaimedFree,
  passClaimedPremium,
  passPoints,
  onUnlockPremium,
  onClaimFree,
  onClaimPremium,
  stardust,
  cosmetics,
  onBuyCosmetic,
  uiDensity,
  onToggleUiDensity,
}: CommandCenterProps) {
  const factionRows = [
    { id: 'union', label: 'Союз Колоний', value: factionRep.union, color: 'bg-cyan-400/70' },
    { id: 'syndicate', label: 'Торговый Синдикат', value: factionRep.syndicate, color: 'bg-amber-400/70' },
    { id: 'keepers', label: 'Хранители Реликвий', value: factionRep.keepers, color: 'bg-violet-400/70' },
  ]

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-cyan-300/20 bg-slate-950/45 p-3">
          <h3 className="text-sm font-semibold text-cyan-100">Сценарная операция</h3>
          <p className="mt-2 text-sm font-medium text-white">{storyTitle}</p>
          <p className="mt-1 text-xs text-slate-300">{storyDescription}</p>
          <div className="mt-3 grid gap-2">
            {storyChoices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => onChooseStory(choice.id)}
                className="rounded-lg border border-white/15 bg-slate-900/50 px-3 py-2 text-left hover:border-cyan-300/40"
              >
                <p className="text-sm font-semibold text-cyan-100">{choice.title}</p>
                <p className="mt-0.5 text-xs text-slate-300">{choice.outcome}</p>
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {factionRows.map((row) => {
              const width = Math.max(8, Math.min(100, 50 + row.value))
              return (
                <div key={row.id}>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-300">
                    <span>{row.label}</span>
                    <span>{row.value > 0 ? `+${row.value}` : row.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 max-h-28 space-y-1 overflow-y-auto pr-1">
            {storyHistory.length === 0 ? (
              <p className="text-xs text-slate-400">История решений появится после первого выбора.</p>
            ) : (
              storyHistory.map((entry, idx) => (
                <p key={`${entry}-${idx}`} className="text-xs text-slate-300">
                  {entry}
                </p>
              ))
            )}
          </div>
        </article>

        <article className="rounded-xl border border-emerald-300/20 bg-slate-950/45 p-3">
          <h3 className="text-sm font-semibold text-emerald-100">Монетизация и прогресс</h3>
          <p className="mt-1 text-xs text-slate-300">Очки пропуска: {passPoints}</p>
          {!passPremium && (
            <button
              type="button"
              onClick={onUnlockPremium}
              className="mt-2 rounded-lg border border-emerald-300/40 bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-400/25"
            >
              Активировать премиум за 25 пыли
            </button>
          )}
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {passMilestones.map((tier) => {
              const freeClaimed = passClaimedFree.includes(tier)
              const premiumClaimed = passClaimedPremium.includes(tier)
              const unlocked = tier <= passTier
              return (
                <div key={tier} className="rounded-lg border border-white/10 bg-slate-900/45 p-2">
                  <p className="text-xs font-semibold text-white">Уровень {tier}</p>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onClaimFree(tier)}
                      disabled={!unlocked || freeClaimed}
                      className="rounded-md border border-cyan-300/35 px-2 py-1 text-[11px] text-cyan-100 disabled:opacity-50"
                    >
                      {freeClaimed ? 'Free: забрано' : 'Free'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onClaimPremium(tier)}
                      disabled={!unlocked || !passPremium || premiumClaimed}
                      className="rounded-md border border-amber-300/35 px-2 py-1 text-[11px] text-amber-100 disabled:opacity-50"
                    >
                      {premiumClaimed ? 'Premium: забрано' : 'Premium'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </article>

        <article className="rounded-xl border border-violet-300/20 bg-slate-950/45 p-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-violet-100">Косметический маркет</h3>
            <p className="text-xs text-slate-300">Пыль: {stardust}</p>
          </div>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {cosmetics.map((item) => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-slate-900/45 p-2">
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="mt-1 text-xs text-slate-300">{item.description}</p>
                <button
                  type="button"
                  onClick={() => onBuyCosmetic(item.id, item.price)}
                  disabled={item.owned}
                  className="mt-2 rounded-md border border-violet-300/35 px-2 py-1 text-[11px] text-violet-100 disabled:opacity-50"
                >
                  {item.owned ? 'Куплено' : `Купить за ${item.price} пыли`}
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-white/10 bg-slate-950/45 p-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Интерфейс</h3>
            <button
              type="button"
              onClick={onToggleUiDensity}
              className="rounded-md border border-white/20 px-2 py-1 text-xs text-slate-200 hover:border-cyan-300/40"
            >
              Плотность: {uiDensity === 'compact' ? 'Компактная' : 'Комфортная'}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-300">
            Компактный режим уменьшает вертикальные отступы и помогает быстрее читать ключевые данные.
          </p>
        </article>
      </div>
    </section>
  )
}
