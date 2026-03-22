type ReferralProps = {
  referralLink: string
  userId: string
  invitedCount: number
  allianceFriends: number
  leaderboard: Array<{ name: string; score: number }>
  onCopy: () => void
  onShareEmpire: () => void
}

export function Referral({
  referralLink,
  userId,
  invitedCount,
  allianceFriends,
  leaderboard,
  onCopy,
  onShareEmpire,
}: ReferralProps) {
  const showAllianceBoost = allianceFriends > 3

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
      <h2 className="text-base font-semibold text-white">Пригласить друзей</h2>
      <p className="mt-1 text-xs text-slate-300">Твой ID: {userId}</p>
      <p className="mt-1 text-xs text-slate-300">Приглашено: {invitedCount}</p>
      <p className="mt-1 text-xs text-slate-300">Друзья в альянсе: {allianceFriends}</p>
      <p className="mt-1 text-xs text-emerald-200">
        Альянс-бонус: {showAllianceBoost ? '+5% к глобальному пассиву' : 'нужно >3 друзей'}
      </p>

      <div className="mt-3 rounded-xl border border-cyan-300/20 bg-slate-900/60 p-3">
        <p className="break-all text-xs text-cyan-100">{referralLink}</p>
      </div>

      <button
        type="button"
        onClick={onCopy}
        className="mt-3 w-full rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
      >
        Скопировать реферальную ссылку
      </button>
      <button
        type="button"
        onClick={onShareEmpire}
        className="mt-2 w-full rounded-xl bg-fuchsia-400 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-300"
      >
        Поделиться империей
      </button>

      <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/55 p-3">
        <p className="text-sm font-semibold text-white">Лидерборд (mock)</p>
        <div className="mt-2 space-y-1">
          {leaderboard.map((item, idx) => (
            <p key={`${item.name}-${idx}`} className="text-xs text-slate-200">
              {idx + 1}. {item.name} — {item.score}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}
