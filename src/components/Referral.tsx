type ReferralProps = {
  referralLink: string
  userId: string
  invitedCount: number
  onCopy: () => void
}

export function Referral({
  referralLink,
  userId,
  invitedCount,
  onCopy,
}: ReferralProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
      <h2 className="text-base font-semibold text-white">Пригласить друзей</h2>
      <p className="mt-1 text-xs text-slate-300">Твой ID: {userId}</p>
      <p className="mt-1 text-xs text-slate-300">Приглашено: {invitedCount}</p>

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
    </section>
  )
}
