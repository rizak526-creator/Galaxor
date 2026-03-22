import { useEffect, useMemo, useState } from 'react'
import { init, miniApp, retrieveLaunchParams, viewport } from '@tma.js/sdk'
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react'
import { GameActions } from './components/GameActions'
import { WalletStatus } from './components/WalletStatus'

function formatTonAddress(address: string): string {
  if (!address) return ''
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function App() {
  const tonAddress = useTonAddress()
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    // Базовая инициализация Telegram Mini Apps SDK.
    init()

    const cleanupHandlers: VoidFunction[] = []

    miniApp.mount.ifAvailable()
    miniApp.ready.ifAvailable()
    viewport.mount.ifAvailable()
    viewport.expand.ifAvailable()
    viewport.requestFullscreen.ifAvailable()

    const miniAppCss = miniApp.bindCssVars.ifAvailable()
    if (miniAppCss.ok) cleanupHandlers.push(miniAppCss.data)

    const viewportCss = viewport.bindCssVars.ifAvailable()
    if (viewportCss.ok) cleanupHandlers.push(viewportCss.data)

    try {
      // Получаем initData и показываем username, если Telegram его прислал.
      const launchParams = retrieveLaunchParams()
      setUsername(launchParams.tgWebAppData?.user?.username ?? null)
    } catch {
      setUsername(null)
    }

    return () => {
      cleanupHandlers.forEach((handler) => handler())
    }
  }, [])

  const formattedTonAddress = useMemo(
    () => formatTonAddress(tonAddress),
    [tonAddress],
  )

  return (
    <main className="space-bg min-h-[100svh] w-full px-4 py-6 text-white sm:px-6">
      <section className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-xl flex-col justify-center rounded-3xl border border-white/10 bg-slate-950/35 p-6 backdrop-blur-xl shadow-[0_0_90px_rgba(20,130,255,0.2)] sm:p-8">
        <p className="text-center text-sm text-slate-300">
          {username ? `Пилот: @${username}` : 'Пилот: имя пользователя недоступно'}
        </p>

        <h1 className="mt-3 text-center text-6xl font-black tracking-wide text-white md:text-7xl galaxor-glow">
          Galaxor
        </h1>

        <p className="mt-4 text-center text-sm text-slate-200/95">
          Telegram Mini App для космической добычи ресурсов
        </p>

        <div className="mt-8 flex justify-center">
          <TonConnectButton className="!w-full max-w-xs" />
        </div>

        <WalletStatus address={formattedTonAddress} />

        <GameActions onStart={() => window.alert('В разработке: тапай по астероидам')} />
      </section>
    </main>
  )
}

export default App
