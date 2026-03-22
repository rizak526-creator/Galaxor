type Artifact = {
  id: string
  name: string
  epoch: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  description: string
  bonusLabel: string
  icon: string
}

type ArtifactGalleryProps = {
  artifacts: Artifact[]
  ownedIds: string[]
  setBonusActive: boolean
  epochSetActive: boolean
}

function rarityClass(rarity: Artifact['rarity']): string {
  if (rarity === 'legendary') return 'artifact-legendary'
  if (rarity === 'epic') return 'artifact-epic'
  if (rarity === 'rare') return 'artifact-rare'
  return 'artifact-common'
}

export function ArtifactGallery({
  artifacts,
  ownedIds,
  setBonusActive,
  epochSetActive,
}: ArtifactGalleryProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
      <h2 className="text-base font-semibold text-white">Артефакты</h2>
      <p className="mt-1 text-xs text-slate-300">
        Собрано: {ownedIds.length} / {artifacts.length}
      </p>
      <p className="mt-1 text-xs text-amber-200">
        Эпоха-бонус: {epochSetActive ? 'Активен (+10% к пассиву)' : 'Собери 3 артефакта одной эпохи'}
      </p>
      <p className="mt-1 text-xs text-amber-200">
        Сет-бонус: {setBonusActive ? 'Активен (+25% к пассиву и аура)' : 'Собери полный набор'}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {artifacts.map((artifact) => {
          const owned = ownedIds.includes(artifact.id)
          return (
            <article
              key={artifact.id}
              className={`rounded-xl border p-3 ${rarityClass(artifact.rarity)} ${owned ? '' : 'opacity-50'}`}
            >
              <p className="text-lg">{artifact.icon}</p>
              <p className="mt-1 text-sm font-semibold text-white">{artifact.name}</p>
              <p className="mt-1 text-xs text-slate-200">{artifact.description}</p>
              <p className="mt-1 text-[11px] text-slate-300">Эпоха: {artifact.epoch}</p>
              <p className="mt-1 text-xs text-cyan-100">{artifact.bonusLabel}</p>
              <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-100">
                {owned ? 'Открыт' : 'Не найден'}
              </p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export type { Artifact }
