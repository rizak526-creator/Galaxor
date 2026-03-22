type WalletStatusProps = {
  address: string
}

export function WalletStatus({ address }: WalletStatusProps) {
  return (
    <div className="mt-6 rounded-2xl border border-cyan-300/20 bg-slate-900/60 p-4 text-center">
      {address ? (
        <p className="text-base font-medium text-cyan-100">Кошелёк: {address}</p>
      ) : (
        <p className="text-sm text-slate-200">
          Подключи TON-кошелёк, чтобы начать добычу ресурсов
        </p>
      )}
    </div>
  )
}
