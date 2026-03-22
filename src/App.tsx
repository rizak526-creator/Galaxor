import { useEffect, useRef, useState } from 'react'
import { init, miniApp, retrieveLaunchParams, viewport } from '@tma.js/sdk'
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react'
import { Asteroid, type AsteroidParticle } from './components/Asteroid'
import { Missions } from './components/Missions'
import { Referral } from './components/Referral'
import { Shop } from './components/Shop'
import { Stats } from './components/Stats'

type InitDataState = {
  username: string | null
  userId: string
}

type MissionsClaimed = {
  taps: boolean
  crystals: boolean
  upgrades: boolean
}

type SaveData = {
  crystals: number
  energy: number
  stardust: number
  totalEarned: number
  tapPower: number
  passivePerTick: number
  multiplier: number
  energyMultiplier: number
  stardustChance: number
  tapCount: number
  upgradesBought: number
  level: number
  missionDay: string
  missionsClaimed: MissionsClaimed
  lastClaimAt: number
  lastSeenAt: number
}

type ToastType = 'info' | 'success'

function formatTonAddress(address: string): string {
  if (!address) return ''
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function getTimeLeftText(lastClaimAt: number): string {
  if (!lastClaimAt) return 'доступно сейчас'
  const leftMs = Math.max(0, lastClaimAt + 24 * 60 * 60 * 1000 - Date.now())
  if (leftMs === 0) return 'доступно сейчас'
  const totalMinutes = Math.ceil(leftMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}ч ${minutes}м`
}

function calculateLevel(base: number): number {
  return Math.floor(Math.sqrt(base / 420)) + 1
}

const PASSIVE_TICK_MS = 3000
const ENERGY_TICK_MS = 10000
const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000

function useInitData(): InitDataState {
  const [state, setState] = useState<InitDataState>({
    username: null,
    userId: 'guest',
  })

  useEffect(() => {
    try {
      const launchParams = retrieveLaunchParams()
      setState({
        username: launchParams.tgWebAppData?.user?.username ?? null,
        userId: String(launchParams.tgWebAppData?.user?.id ?? 'guest'),
      })
    } catch {
      // В браузере вне Telegram используем fallback.
      setState({ username: null, userId: 'guest' })
    }
  }, [])

  return state
}

function App() {
  const tonAddress = useTonAddress()
  const { username, userId } = useInitData()
  const [crystals, setCrystals] = useState(0)
  const [energy, setEnergy] = useState(0)
  const [stardust, setStardust] = useState(0)
  const [totalEarned, setTotalEarned] = useState(0)
  const [tapPower, setTapPower] = useState(1)
  const [passivePerTick, setPassivePerTick] = useState(1)
  const [multiplier, setMultiplier] = useState(1)
  const [energyMultiplier, setEnergyMultiplier] = useState(1)
  const [stardustChance, setStardustChance] = useState(1)
  const [level, setLevel] = useState(1)
  const [tapCount, setTapCount] = useState(0)
  const [upgradesBought, setUpgradesBought] = useState(0)
  const [missionDay, setMissionDay] = useState(getTodayKey())
  const [missionsClaimed, setMissionsClaimed] = useState<MissionsClaimed>({
    taps: false,
    crystals: false,
    upgrades: false,
  })
  const [lastClaimAt, setLastClaimAt] = useState(0)
  const [canClaimDaily, setCanClaimDaily] = useState(true)
  const [activeTab, setActiveTab] = useState<'shop' | 'missions' | 'referral'>(
    'shop',
  )
  const [isTapBurst, setIsTapBurst] = useState(false)
  const [particles, setParticles] = useState<AsteroidParticle[]>([])
  const [toast, setToast] = useState<{ text: string; type: ToastType } | null>(
    null,
  )
  const particleIdRef = useRef(1)
  const burstTimerRef = useRef<number | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const isHydratedRef = useRef(false)
  const passiveBufferRef = useRef(0)
  const energyBufferRef = useRef(0)
  const referralLink = `https://t.me/Galaxor_bot?start=ref_${userId}`
  const walletConnected = Boolean(tonAddress)

  const passiveIncome = passivePerTick * multiplier
  const missionTapDone = tapCount >= 200
  const missionCrystalsDone = crystals >= 500
  const missionUpgradesDone = upgradesBought >= 2

  const costPassive = Math.floor(90 * Math.pow(multiplier, 1.42))
  const costTap = Math.floor(130 * Math.pow(tapPower, 1.36))
  const costEnergy = Math.floor(260 * Math.pow(energyMultiplier, 1.6))
  const costRare = Math.floor(700 * Math.pow(stardustChance + 1, 1.35))
  const tapMissionReward = 100 + level * 20
  const upgradesMissionReward = 200 + level * 25
  const crystalsMissionEnergyReward = 1 + Math.floor(level / 15)
  const levelFloorBase = Math.pow(level - 1, 2) * 420
  const nextLevelBase = Math.pow(level, 2) * 420
  const levelProgress = Math.max(0, totalEarned - levelFloorBase)
  const levelProgressTotal = Math.max(1, nextLevelBase - levelFloorBase)

  const showToast = (text: string, type: ToastType = 'info') => {
    setToast({ text, type })
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
    }, 1200)
  }

  useEffect(() => {
    const cleanupHandlers: VoidFunction[] = []

    try {
      // Инициализируем Telegram Mini App SDK c безопасным fallback.
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
      // Вне Telegram логика игры продолжает работать в браузерном режиме.
    }

    return () => cleanupHandlers.forEach((handler) => handler())
  }, [])

  useEffect(() => {
    // Загружаем сохранение игрока из localStorage.
    const rawSave = window.localStorage.getItem('galaxor_save')
    if (!rawSave) {
      isHydratedRef.current = true
      return
    }

    try {
      const parsed = JSON.parse(rawSave) as Partial<SaveData>
      const baseCrystals = parsed.crystals ?? 0
      const baseEnergy = parsed.energy ?? 0
      const baseStardust = parsed.stardust ?? 0
      const baseTotal = parsed.totalEarned ?? 0
      const baseTapPower = parsed.tapPower ?? 1
      const basePassivePerTick = parsed.passivePerTick ?? 1
      const baseMultiplier = parsed.multiplier ?? 1
      const baseEnergyMultiplier = parsed.energyMultiplier ?? 1
      const baseStardustChance = parsed.stardustChance ?? 1
      const baseTapCount = parsed.tapCount ?? 0
      const baseUpgrades = parsed.upgradesBought ?? 0
      const baseLastSeen = parsed.lastSeenAt ?? Date.now()

      // Оффлайн-прогресс (до 8 часов), чтобы возвращение в игру было приятным.
      const elapsed = Math.max(0, Math.min(Date.now() - baseLastSeen, MAX_OFFLINE_MS))
      const offlineCrystalTicks = Math.floor(elapsed / PASSIVE_TICK_MS)
      const offlineEnergyTicks = Math.floor(elapsed / ENERGY_TICK_MS)
      const offlineCrystals = Math.floor(
        offlineCrystalTicks * basePassivePerTick * baseMultiplier,
      )
      const offlineEnergy = Math.floor(offlineEnergyTicks * baseEnergyMultiplier)

      setCrystals(baseCrystals + offlineCrystals)
      setEnergy(baseEnergy + offlineEnergy)
      setStardust(baseStardust)
      setTotalEarned(baseTotal + offlineCrystals)
      setTapPower(baseTapPower)
      setPassivePerTick(basePassivePerTick)
      setMultiplier(baseMultiplier)
      setEnergyMultiplier(baseEnergyMultiplier)
      setStardustChance(baseStardustChance)
      setTapCount(baseTapCount)
      setUpgradesBought(baseUpgrades)
      setLevel(parsed.level ?? calculateLevel(baseTotal + offlineCrystals))
      setMissionDay(parsed.missionDay ?? getTodayKey())
      setMissionsClaimed(
        parsed.missionsClaimed ?? { taps: false, crystals: false, upgrades: false },
      )
      setLastClaimAt(parsed.lastClaimAt ?? 0)

      if (offlineCrystals > 0 || offlineEnergy > 0) {
        showToast(
          `Оффлайн добыча: +${offlineCrystals} крист., +${offlineEnergy} энергии`,
          'success',
        )
      }
    } catch {
      // Поврежденный save пропускаем и запускаем с дефолтными значениями.
    } finally {
      isHydratedRef.current = true
    }
  }, [])

  useEffect(() => {
    // Ежедневный сброс миссий.
    const today = getTodayKey()
    if (missionDay === today) return
    setMissionDay(today)
    setTapCount(0)
    setUpgradesBought(0)
    setMissionsClaimed({ taps: false, crystals: false, upgrades: false })
  }, [missionDay])

  useEffect(() => {
    // Проверяем кд ежедневного бонуса.
    const updateDailyStatus = () => {
      const lastClaimRaw = window.localStorage.getItem('lastClaim')
      const source = Number(lastClaimRaw || lastClaimAt || 0)
      setCanClaimDaily(Date.now() - source >= 24 * 60 * 60 * 1000)
    }

    updateDailyStatus()
    const timer = window.setInterval(updateDailyStatus, 60000)
    return () => window.clearInterval(timer)
  }, [lastClaimAt])

  useEffect(() => {
    // Сохраняем весь игровой прогресс единым объектом.
    const saveData: SaveData = {
      crystals,
      energy,
      stardust,
      totalEarned,
      tapPower,
      passivePerTick,
      multiplier,
      energyMultiplier,
      stardustChance,
      tapCount,
      upgradesBought,
      level,
      missionDay,
      missionsClaimed,
      lastClaimAt,
      lastSeenAt: Date.now(),
    }
    window.localStorage.setItem('galaxor_save', JSON.stringify(saveData))
  }, [
    crystals,
    energy,
    stardust,
    totalEarned,
    tapPower,
    passivePerTick,
    multiplier,
    energyMultiplier,
    stardustChance,
    tapCount,
    upgradesBought,
    level,
    missionDay,
    missionsClaimed,
    lastClaimAt,
  ])

  useEffect(() => {
    // Пассивная добыча кристаллов.
    const timer = window.setInterval(() => {
      passiveBufferRef.current += passiveIncome
      const readyCrystals = Math.floor(passiveBufferRef.current)
      if (readyCrystals > 0) {
        passiveBufferRef.current -= readyCrystals
        setCrystals((prev) => prev + readyCrystals)
        setTotalEarned((prev) => prev + readyCrystals)
      }
    }, PASSIVE_TICK_MS)

    return () => window.clearInterval(timer)
  }, [passiveIncome])

  useEffect(() => {
    // Пассивный прирост энергии каждые 10 секунд, учитывая множитель.
    const timer = window.setInterval(() => {
      energyBufferRef.current += energyMultiplier
      const readyEnergy = Math.floor(energyBufferRef.current)
      if (readyEnergy > 0) {
        energyBufferRef.current -= readyEnergy
        setEnergy((prev) => prev + readyEnergy)
      }
    }, ENERGY_TICK_MS)

    return () => window.clearInterval(timer)
  }, [energyMultiplier])

  useEffect(() => {
    // Авторасчет уровня с бонусом за каждое новое достижение.
    if (!isHydratedRef.current) return
    const nextLevel = calculateLevel(totalEarned)
    if (nextLevel <= level) return
    const diff = nextLevel - level
    const reward = diff * 150
    setLevel(nextLevel)
    setCrystals((prev) => prev + reward)
    setTotalEarned((prev) => prev + reward)
    showToast(`Уровень ${nextLevel}! Бонус +${reward} кристаллов`, 'success')
  }, [level, totalEarned])

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current)
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  const handleAsteroidTap = (clientX: number, clientY: number) => {
    const gain = tapPower
    setCrystals((prev) => prev + gain)
    setTotalEarned((prev) => prev + gain)
    setTapCount((prev) => prev + 1)
    setIsTapBurst(true)

    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current)
    burstTimerRef.current = window.setTimeout(() => {
      setIsTapBurst(false)
    }, 200)

    // Спавним 4-6 частиц по месту тапа.
    const count = 4 + Math.floor(Math.random() * 3)
    const createdParticles: AsteroidParticle[] = Array.from(
      { length: count },
      () => ({
        id: particleIdRef.current++,
        x: clientX,
        y: clientY,
        size: 8 + Math.floor(Math.random() * 8),
        dx: Math.floor(Math.random() * 90 - 45),
        dy: Math.floor(Math.random() * 90 - 45),
      }),
    )

    setParticles((prev) => [...prev, ...createdParticles])
    window.setTimeout(() => {
      setParticles((prev) =>
        prev.filter(
          (particle) =>
            !createdParticles.some((created) => created.id === particle.id),
        ),
      )
    }, 800)

    // Редкие дропы с тапа.
    if (energy > 0 && Math.random() < 0.05) {
      setEnergy((prev) => prev + 1)
      showToast('+1 энергия (дроп)', 'success')
    }

    if (level >= 8 && Math.random() < stardustChance / 100) {
      setStardust((prev) => prev + 1)
      showToast('+1 звёздная пыль!', 'success')
    }
  }

  const buyPassiveUpgrade = () => {
    if (crystals < costPassive) return
    setCrystals((prev) => prev - costPassive)
    setPassivePerTick((prev) => prev + 0.5)
    setMultiplier((prev) => prev + 0.35)
    setUpgradesBought((prev) => prev + 1)
    showToast('Улучшение куплено: Ускорить пассив', 'success')
  }

  const buyTapUpgrade = () => {
    if (crystals < costTap) return
    setCrystals((prev) => prev - costTap)
    setTapPower((prev) => prev + 1)
    setUpgradesBought((prev) => prev + 1)
    showToast('Улучшение куплено: Увеличить тап', 'success')
  }

  const buyEnergyUpgrade = () => {
    if (crystals < costEnergy || level < 3) return
    setCrystals((prev) => prev - costEnergy)
    setEnergyMultiplier((prev) => prev + 0.35)
    setUpgradesBought((prev) => prev + 1)
    showToast('Улучшение куплено: Энергия бустер', 'success')
  }

  const buyRareDropUpgrade = () => {
    if (crystals < costRare || level < 6) return
    setCrystals((prev) => prev - costRare)
    setStardustChance((prev) => prev + 0.4)
    setUpgradesBought((prev) => prev + 1)
    showToast('Улучшение куплено: Редкий дроп', 'success')
  }

  const claimDailyBonus = () => {
    if (!canClaimDaily) return
    const reward = 50 * level
    const now = Date.now()
    setCrystals((prev) => prev + reward)
    setTotalEarned((prev) => prev + reward)
    setCanClaimDaily(false)
    setLastClaimAt(now)
    window.localStorage.setItem('lastClaim', String(now))
    showToast(`Ежедневный бонус: +${reward} кристаллов`, 'success')
  }

  const claimMissionTap = () => {
    if (!missionTapDone || missionsClaimed.taps) return
    setMissionsClaimed((prev) => ({ ...prev, taps: true }))
    setCrystals((prev) => prev + tapMissionReward)
    setTotalEarned((prev) => prev + tapMissionReward)
    showToast(`Миссия выполнена: +${tapMissionReward} кристаллов`, 'success')
  }

  const claimMissionCrystals = () => {
    if (!missionCrystalsDone || missionsClaimed.crystals) return
    setMissionsClaimed((prev) => ({ ...prev, crystals: true }))
    setEnergy((prev) => prev + crystalsMissionEnergyReward)
    showToast(`Миссия выполнена: +${crystalsMissionEnergyReward} энергия`, 'success')
  }

  const claimMissionUpgrades = () => {
    if (!missionUpgradesDone || missionsClaimed.upgrades) return
    setMissionsClaimed((prev) => ({ ...prev, upgrades: true }))
    setCrystals((prev) => prev + upgradesMissionReward)
    setTotalEarned((prev) => prev + upgradesMissionReward)
    showToast(`Миссия выполнена: +${upgradesMissionReward} кристаллов`, 'success')
  }

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      showToast('Реферальная ссылка скопирована', 'success')
    } catch {
      showToast('Не удалось скопировать ссылку', 'info')
    }
  }

  return (
    <main className="space-bg min-h-[100svh] w-full px-4 py-6 text-white sm:px-6">
      <section className="relative mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-4xl flex-col rounded-3xl border border-white/10 bg-slate-950/40 p-5 backdrop-blur-xl shadow-[0_0_90px_rgba(20,130,255,0.2)] sm:p-8">
        <p className="text-center text-sm text-slate-300">
          {username ? `Пилот: @${username}` : 'Пилот: имя пользователя недоступно'}
        </p>

        <h1 className="mt-2 text-center text-5xl font-black tracking-wide text-white sm:text-6xl galaxor-glow">
          Galaxor
        </h1>
        <p className="mt-3 text-center text-sm text-slate-200/95">
          Idle-стратегия космической добычи ресурсов
        </p>

        <div className="mt-6 flex justify-center">
          <TonConnectButton className="!w-full max-w-xs" />
        </div>

        {!walletConnected ? (
          <p className="mx-auto mt-6 max-w-md rounded-2xl border border-cyan-300/20 bg-slate-900/60 p-4 text-center text-sm text-slate-200">
            Подключи кошелёк TON для сохранения прогресса и вывода
          </p>
        ) : (
          <div className="mt-6 space-y-5">
            <Stats
              crystals={crystals}
              energy={energy}
              stardust={stardust}
              level={level}
              totalEarned={totalEarned}
              passiveIncome={passiveIncome}
              walletAddress={formatTonAddress(tonAddress)}
              levelProgress={levelProgress}
              levelProgressTotal={levelProgressTotal}
            />

            <Asteroid
              isTapBurst={isTapBurst}
              particles={particles}
              onTap={handleAsteroidTap}
            />

            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-2">
              <button
                type="button"
                onClick={() => setActiveTab('shop')}
                className={`tab-btn ${activeTab === 'shop' ? 'tab-btn-active' : ''}`}
              >
                Магазин
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('missions')}
                className={`tab-btn ${activeTab === 'missions' ? 'tab-btn-active' : ''}`}
              >
                Миссии
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('referral')}
                className={`tab-btn ${activeTab === 'referral' ? 'tab-btn-active' : ''}`}
              >
                Пригласить
              </button>
            </div>

            {activeTab === 'shop' && (
              <Shop
                crystals={crystals}
                level={level}
                costPassive={costPassive}
                costTap={costTap}
                costEnergy={costEnergy}
                costRare={costRare}
                stardustChance={stardustChance}
                onBuyPassive={buyPassiveUpgrade}
                onBuyTap={buyTapUpgrade}
                onBuyEnergy={buyEnergyUpgrade}
                onBuyRare={buyRareDropUpgrade}
              />
            )}

            {activeTab === 'missions' && (
              <Missions
                level={level}
                canClaimDaily={canClaimDaily}
                dailyReward={50 * level}
                dailyCooldown={getTimeLeftText(lastClaimAt)}
                missionTapDone={missionTapDone}
                missionTapProgress={tapCount}
                missionTapClaimed={missionsClaimed.taps}
                missionTapReward={tapMissionReward}
                missionCrystalsDone={missionCrystalsDone}
                missionCrystalsProgress={Math.min(crystals, 500)}
                missionCrystalsClaimed={missionsClaimed.crystals}
                missionCrystalsEnergyReward={crystalsMissionEnergyReward}
                missionUpgradesDone={missionUpgradesDone}
                missionUpgradesProgress={upgradesBought}
                missionUpgradesClaimed={missionsClaimed.upgrades}
                missionUpgradesReward={upgradesMissionReward}
                onClaimDaily={claimDailyBonus}
                onClaimTapMission={claimMissionTap}
                onClaimCrystalsMission={claimMissionCrystals}
                onClaimUpgradesMission={claimMissionUpgrades}
              />
            )}

            {activeTab === 'referral' && (
              <Referral
                referralLink={referralLink}
                userId={userId}
                invitedCount={0}
                onCopy={copyReferralLink}
              />
            )}
          </div>
        )}

        {toast && (
          <div
            className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-info'}`}
          >
            {toast.text}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
