import { useEffect, useRef, useState } from 'react'
import { init, miniApp, retrieveLaunchParams, viewport } from '@tma.js/sdk'
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react'

function formatTonAddress(address: string): string {
  if (!address) return ''
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

type Particle = {
  id: number
  x: number
  y: number
  size: number
}

type InitDataState = {
  username: string | null
  userId: string
}

function getSavedNumber(key: string): number {
  const rawValue = window.localStorage.getItem(key)
  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function useInitData(): InitDataState {
  const [state, setState] = useState<InitDataState>({
    username: null,
    userId: 'demo-user',
  })

  useEffect(() => {
    try {
      const launchParams = retrieveLaunchParams()
      setState({
        username: launchParams.tgWebAppData?.user?.username ?? null,
        userId: String(launchParams.tgWebAppData?.user?.id ?? 'demo-user'),
      })
    } catch {
      // Fallback для запуска вне Telegram-контекста.
      setState({ username: null, userId: 'demo-user' })
    }
  }, [])

  return state
}

function App() {
  const tonAddress = useTonAddress()
  const { username, userId } = useInitData()
  const [crystals, setCrystals] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [canClaimDaily, setCanClaimDaily] = useState(true)
  const [isTapBurst, setIsTapBurst] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [copyMessage, setCopyMessage] = useState('')
  const asteroidRef = useRef<HTMLDivElement | null>(null)
  const particleIdRef = useRef(1)
  const burstTimerRef = useRef<number | null>(null)
  const copyTimerRef = useRef<number | null>(null)
  const referralLink = `https://t.me/Galaxor_bot?start=ref_${userId}`

  const walletConnected = Boolean(tonAddress)

  useEffect(() => {
    const cleanupHandlers: VoidFunction[] = []

    try {
      // Вне Telegram (например localhost) SDK может бросать исключение.
      // В этом случае оставляем обычный веб-режим без Telegram API.
      init()

      miniApp.mount.ifAvailable()
      miniApp.ready.ifAvailable()
      viewport.mount.ifAvailable()
      viewport.expand.ifAvailable()
      viewport.requestFullscreen.ifAvailable()

      const miniAppCss = miniApp.bindCssVars.ifAvailable()
      if (miniAppCss.ok) cleanupHandlers.push(miniAppCss.data)

      const viewportCss = viewport.bindCssVars.ifAvailable()
      if (viewportCss.ok) cleanupHandlers.push(viewportCss.data)

    } catch {
      // Fallback для запуска в браузере без Telegram-контекста.
    }

    return () => {
      cleanupHandlers.forEach((handler) => handler())
    }
  }, [])

  useEffect(() => {
    // Восстанавливаем прогресс игрока из localStorage.
    setCrystals(getSavedNumber('galaxor_crystals'))
    setTotalEarned(getSavedNumber('galaxor_total_earned'))

    // Проверяем доступность daily-бонуса (24 часа).
    const lastClaimRaw = window.localStorage.getItem('galaxor_last_claim')
    if (!lastClaimRaw) {
      setCanClaimDaily(true)
      return
    }

    const lastClaimTime = Number(lastClaimRaw)
    const twentyFourHours = 24 * 60 * 60 * 1000
    setCanClaimDaily(Date.now() - lastClaimTime >= twentyFourHours)
  }, [])

  useEffect(() => {
    // Сохраняем текущие ресурсы, чтобы прогресс не терялся при перезагрузке.
    window.localStorage.setItem('galaxor_crystals', String(crystals))
    window.localStorage.setItem('galaxor_total_earned', String(totalEarned))
  }, [crystals, totalEarned])

  useEffect(() => {
    // Пассивный доход: +1 кристалл каждые 3 секунды.
    const timer = window.setInterval(() => {
      setCrystals((prev) => prev + 1)
      setTotalEarned((prev) => prev + 1)
    }, 3000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current)
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
    }
  }, [])

  const spawnParticles = (clientX: number, clientY: number) => {
    const asteroidRect = asteroidRef.current?.getBoundingClientRect()
    if (!asteroidRect) return

    const centerX = clientX - asteroidRect.left
    const centerY = clientY - asteroidRect.top
    const count = 3 + Math.floor(Math.random() * 3)

    const nextParticles: Particle[] = Array.from({ length: count }, () => ({
      id: particleIdRef.current++,
      x: centerX + (Math.random() * 60 - 30),
      y: centerY + (Math.random() * 60 - 30),
      size: 8 + Math.floor(Math.random() * 8),
    }))

    setParticles((prev) => [...prev, ...nextParticles])

    window.setTimeout(() => {
      setParticles((prev) =>
        prev.filter(
          (particle) =>
            !nextParticles.some((created) => created.id === particle.id),
        ),
      )
    }, 800)
  }

  const handleTap = (clientX: number, clientY: number) => {
    setCrystals((prev) => prev + 1)
    setTotalEarned((prev) => prev + 1)
    setIsTapBurst(true)
    spawnParticles(clientX, clientY)

    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current)
    burstTimerRef.current = window.setTimeout(() => {
      setIsTapBurst(false)
    }, 180)
  }

  const claimDailyBonus = () => {
    if (!canClaimDaily) return
    setCrystals((prev) => prev + 50)
    setTotalEarned((prev) => prev + 50)
    setCanClaimDaily(false)
    window.localStorage.setItem('galaxor_last_claim', String(Date.now()))
  }

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopyMessage('Реферальная ссылка скопирована')
    } catch {
      setCopyMessage('Не удалось скопировать ссылку')
    }

    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => {
      setCopyMessage('')
    }, 2000)
  }

  return (
    <main className="space-bg min-h-[100svh] w-full px-4 py-6 text-white sm:px-6">
      <section className="mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-xl flex-col justify-center rounded-3xl border border-white/10 bg-slate-950/35 p-6 backdrop-blur-xl shadow-[0_0_90px_rgba(20,130,255,0.2)] sm:p-8 relative">
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

        {!walletConnected ? (
          <p className="mt-6 rounded-2xl border border-cyan-300/20 bg-slate-900/60 p-4 text-center text-sm text-slate-200">
            Подключи TON-кошелёк, чтобы начать добычу
          </p>
        ) : (
          <div className="mt-6">
            <p className="text-center text-lg font-semibold text-cyan-100">
              💎 Кристаллы: {crystals} (всего заработано: {totalEarned})
            </p>
            <p className="mt-2 text-center text-sm text-slate-300">
              Пассивно: +1 кристалл / 3 сек
            </p>

            <div className="mt-8 flex justify-center">
              <div
                ref={asteroidRef}
                className={`asteroid ${isTapBurst ? 'tap-burst' : ''}`}
                onClick={(event) => handleTap(event.clientX, event.clientY)}
                onTouchStart={(event) => {
                  event.preventDefault()
                  const firstTouch = event.touches[0]
                  if (!firstTouch) return
                  handleTap(firstTouch.clientX, firstTouch.clientY)
                }}
              >
                {particles.map((particle) => (
                  <div
                    key={particle.id}
                    className="particle"
                    style={{
                      left: `${particle.x}px`,
                      top: `${particle.y}px`,
                      width: `${particle.size}px`,
                      height: `${particle.size}px`,
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={claimDailyBonus}
                disabled={!canClaimDaily}
                className="w-full rounded-2xl bg-amber-300 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
              >
                Забрать ежедневный бонус +50
              </button>

              <button
                type="button"
                onClick={copyReferralLink}
                className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Пригласить друга
              </button>
            </div>

            <p className="mt-3 text-center text-sm text-slate-300">
              Приглашено друзей: 0
            </p>
            {!!copyMessage && (
              <p className="mt-1 text-center text-sm text-cyan-200">{copyMessage}</p>
            )}

            <p className="mt-3 text-center text-sm text-slate-300">
              Твой кошелёк: {formatTonAddress(tonAddress)}
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
