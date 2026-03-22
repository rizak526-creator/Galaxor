import { useEffect, useRef, useState } from 'react'
import { init, miniApp, retrieveLaunchParams, viewport } from '@tma.js/sdk'
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react'
import { type AsteroidParticle } from './components/Asteroid'
import { EventNotification } from './components/EventNotification'
import { type ExpeditionRecord, Expedition } from './components/Expedition'
import { Fleet } from './components/Fleet'
import { Missions } from './components/Missions'
import { type FleetShip, type Planet, PlanetMap } from './components/PlanetMap'
import { Referral } from './components/Referral'
import { Shop } from './components/Shop'
import { Stats } from './components/Stats'
import { BALANCE } from './game/balance'

type InitDataState = {
  username: string | null
  userId: string
}

type MissionsClaimed = {
  taps: boolean
  crystals: boolean
  upgrades: boolean
}

type ActiveEvent = {
  type: 'meteor' | 'anomaly'
  title: string
  description: string
  endAt: number
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
  currentPlanetId: string
  planets: Planet[]
  ships: FleetShip[]
  expeditions: ExpeditionRecord[]
  freeUpgradeTokens: number
}

type ToastType = 'info' | 'success'
type TabType = 'shop' | 'missions' | 'referral' | 'fleet' | 'expeditions'

const PASSIVE_TICK_MS = BALANCE.tick.passiveMs
const ENERGY_TICK_MS = BALANCE.tick.energyMs
const MAX_OFFLINE_MS = BALANCE.offline.maxMs

const PLANETS_TEMPLATE: Planet[] = [
  {
    id: 'earth-like',
    name: 'Earth-like',
    subtitle: 'Стабильные залежи кристаллов и мягкий климат',
    unlocked: true,
    unlockLevel: 1,
    passiveMultiplier: 1.0,
    tapBonus: { crystals: 1.0, energyChance: 0, stardustChance: 0 },
    objectClass: 'planet-earth',
    icon: '🌍',
  },
  {
    id: 'gas-giant',
    name: 'Gas Giant',
    subtitle: 'Газовые вихри усиливают генераторы добычи',
    unlocked: false,
    unlockLevel: 3,
    passiveMultiplier: 1.5,
    tapBonus: { crystals: 1.1, energyChance: 0.02, stardustChance: 0 },
    objectClass: 'planet-gas',
    icon: '🪐',
  },
  {
    id: 'nebula',
    name: 'Nebula',
    subtitle: 'Туманность замедляет добычу, но насыщает поле энергией',
    unlocked: false,
    unlockLevel: 5,
    passiveMultiplier: 0.8,
    tapBonus: { crystals: 1.0, energyChance: 0.05, stardustChance: 0.2 },
    objectClass: 'planet-nebula',
    icon: '🌌',
  },
  {
    id: 'black-hole',
    name: 'Black Hole',
    subtitle: 'Сильная гравитация резко повышает общий пассив',
    unlocked: false,
    unlockLevel: 8,
    passiveMultiplier: 2.2,
    tapBonus: { crystals: 1.25, energyChance: 0.01, stardustChance: 0.4 },
    objectClass: 'planet-blackhole',
    icon: '🕳️',
  },
  {
    id: 'ice-world',
    name: 'Ice World',
    subtitle: 'Ледяные шахты стабильно питают добывающие установки',
    unlocked: false,
    unlockLevel: 12,
    passiveMultiplier: 1.8,
    tapBonus: { crystals: 1.15, energyChance: 0.03, stardustChance: 0.6 },
    objectClass: 'planet-ice',
    icon: '🧊',
  },
  {
    id: 'ancient-ruins',
    name: 'Ancient Ruins',
    subtitle: 'Древние руины усиливают резонанс звёздной пыли',
    unlocked: false,
    unlockLevel: 18,
    passiveMultiplier: 3.0,
    tapBonus: { crystals: 1.1, energyChance: 0.02, stardustChance: 3.0 },
    objectClass: 'planet-ruins',
    icon: '🏛️',
  },
]

const SHIPS_TEMPLATE: FleetShip[] = [
  { id: 'mining-drone', name: 'Mining Drone', icon: '🚀', level: 0 },
  { id: 'explorer-scout', name: 'Explorer Scout', icon: '🛰️', level: 0 },
  { id: 'harvester-probe', name: 'Harvester Probe', icon: '🤖', level: 0 },
]

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
  const leftMs = Math.max(0, lastClaimAt + BALANCE.daily.cooldownMs - Date.now())
  if (leftMs === 0) return 'доступно сейчас'
  const totalMinutes = Math.ceil(leftMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}ч ${minutes}м`
}

function calculateLevel(base: number): number {
  return Math.floor(Math.sqrt(base / BALANCE.level.divisor)) + 1
}

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

  const [planets, setPlanets] = useState<Planet[]>(PLANETS_TEMPLATE)
  const [currentPlanetId, setCurrentPlanetId] = useState(PLANETS_TEMPLATE[0].id)
  const [ships, setShips] = useState<FleetShip[]>(SHIPS_TEMPLATE)
  const [expeditions, setExpeditions] = useState<ExpeditionRecord[]>([])
  const [selectedShipId, setSelectedShipId] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(2)
  const [freeUpgradeTokens, setFreeUpgradeTokens] = useState(0)

  const [activeTab, setActiveTab] = useState<TabType>('shop')
  const [isTapBurst, setIsTapBurst] = useState(false)
  const [particles, setParticles] = useState<AsteroidParticle[]>([])
  const [toast, setToast] = useState<{ text: string; type: ToastType } | null>(
    null,
  )
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null)
  const [eventNotice, setEventNotice] = useState<{
    title: string
    description: string
    visible: boolean
  } | null>(null)

  const particleIdRef = useRef(1)
  const burstTimerRef = useRef<number | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const eventNoticeTimerRef = useRef<number | null>(null)
  const isHydratedRef = useRef(false)
  const passiveBufferRef = useRef(0)
  const energyBufferRef = useRef(0)
  const referralLink = `https://t.me/Galaxor_bot?start=ref_${userId}`
  const walletConnected = Boolean(tonAddress)

  const explorerLevel = ships.find((ship) => ship.id === 'explorer-scout')?.level ?? 0
  const miningLevel = ships.find((ship) => ship.id === 'mining-drone')?.level ?? 0
  const harvesterLevel = ships.find((ship) => ship.id === 'harvester-probe')?.level ?? 0

  const activePlanet =
    planets.find((planet) => planet.id === currentPlanetId) ?? planets[0]
  const unlockedPlanets = planets.filter((planet) => planet.unlocked)

  let planetsPassiveSum = 0
  for (const planet of unlockedPlanets) planetsPassiveSum += planet.passiveMultiplier

  const fleetPassiveMultiplier = Math.pow(BALANCE.ships.passivePerLevel, miningLevel)
  const eventTapMultiplier =
    activeEvent?.type === 'meteor' ? BALANCE.events.meteorTapMultiplier : 1
  const eventPassiveMultiplier =
    activeEvent?.type === 'anomaly' ? BALANCE.events.anomalyPassiveMultiplier : 1
  const anomalyStardustBonus =
    activeEvent?.type === 'anomaly' ? BALANCE.drops.anomalyStardustBonus : 0

  const passiveIncome =
    passivePerTick *
    multiplier *
    Math.max(1, planetsPassiveSum) *
    fleetPassiveMultiplier *
    eventPassiveMultiplier

  const missionTapDone = tapCount >= BALANCE.missions.tapsGoal
  const missionCrystalsDone = crystals >= BALANCE.missions.crystalsGoal
  const missionUpgradesDone = upgradesBought >= BALANCE.missions.upgradesGoal

  const costPassive = Math.floor(
    BALANCE.shop.passive.base * Math.pow(multiplier, BALANCE.shop.passive.power),
  )
  const costTap = Math.floor(
    BALANCE.shop.tap.base * Math.pow(tapPower, BALANCE.shop.tap.power),
  )
  const costEnergy = Math.floor(
    BALANCE.shop.energy.base *
      Math.pow(energyMultiplier, BALANCE.shop.energy.power),
  )
  const costRare = Math.floor(
    BALANCE.shop.rare.base * Math.pow(stardustChance + 1, BALANCE.shop.rare.power),
  )

  const tapMissionReward =
    BALANCE.missions.tapRewardBase + level * BALANCE.missions.tapRewardPerLevel
  const upgradesMissionReward =
    BALANCE.missions.upgradesRewardBase +
    level * BALANCE.missions.upgradesRewardPerLevel
  const crystalsMissionEnergyReward =
    1 + Math.floor(level / BALANCE.missions.energyRewardPerLevelStep)

  const levelFloorBase = Math.pow(level - 1, 2) * BALANCE.level.divisor
  const nextLevelBase = Math.pow(level, 2) * BALANCE.level.divisor
  const levelProgress = Math.max(0, totalEarned - levelFloorBase)
  const levelProgressTotal = Math.max(1, nextLevelBase - levelFloorBase)

  const showToast = (text: string, type: ToastType = 'info') => {
    setToast({ text, type })
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null)
    }, 1600)
  }

  const showEventNotice = (title: string, description: string) => {
    setEventNotice({ title, description, visible: true })
    if (eventNoticeTimerRef.current) window.clearTimeout(eventNoticeTimerRef.current)
    eventNoticeTimerRef.current = window.setTimeout(() => {
      setEventNotice((prev) =>
        prev ? { ...prev, visible: false } : { title, description, visible: false },
      )
    }, 10000)
  }

  const getShipCost = (shipId: string, shipLevel: number) => {
    if (shipId === 'mining-drone') {
      return Math.floor(
        BALANCE.ships.mining.base * Math.pow(BALANCE.ships.mining.growth, shipLevel),
      )
    }
    if (shipId === 'explorer-scout') {
      return Math.floor(
        BALANCE.ships.explorer.base *
          Math.pow(BALANCE.ships.explorer.growth, shipLevel),
      )
    }
    return Math.floor(
      BALANCE.ships.harvester.base *
        Math.pow(BALANCE.ships.harvester.growth, shipLevel),
    )
  }

  useEffect(() => {
    const cleanupHandlers: VoidFunction[] = []
    try {
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
      // В браузере без Telegram игра продолжает работать в fallback-режиме.
    }
    return () => cleanupHandlers.forEach((handler) => handler())
  }, [])

  useEffect(() => {
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
      const baseCurrentPlanetId = parsed.currentPlanetId ?? PLANETS_TEMPLATE[0].id
      const basePlanets = parsed.planets ?? PLANETS_TEMPLATE
      const baseShips = parsed.ships ?? SHIPS_TEMPLATE
      const baseExpeditions = parsed.expeditions ?? []
      const baseFreeTokens = parsed.freeUpgradeTokens ?? 0

      const elapsed = Math.max(0, Math.min(Date.now() - baseLastSeen, MAX_OFFLINE_MS))
      let savedPassiveSum = 0
      for (const item of basePlanets) {
        if (item.unlocked) savedPassiveSum += item.passiveMultiplier
      }
      const savedMiningLevel =
        baseShips.find((ship) => ship.id === 'mining-drone')?.level ?? 0
      const savedPassiveBoost = Math.pow(BALANCE.ships.passivePerLevel, savedMiningLevel)
      const offlineCrystalTicks = Math.floor(elapsed / PASSIVE_TICK_MS)
      const offlineEnergyTicks = Math.floor(elapsed / ENERGY_TICK_MS)
      const offlineCrystals = Math.floor(
        offlineCrystalTicks *
          basePassivePerTick *
          baseMultiplier *
          Math.max(1, savedPassiveSum) *
          savedPassiveBoost *
          BALANCE.offline.boost,
      )
      const offlineEnergy = Math.floor(
        offlineEnergyTicks * baseEnergyMultiplier * BALANCE.offline.boost,
      )

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
      setCurrentPlanetId(baseCurrentPlanetId)
      setPlanets(basePlanets)
      setShips(baseShips)
      setExpeditions(baseExpeditions)
      setFreeUpgradeTokens(baseFreeTokens)

      if (offlineCrystals > 0 || offlineEnergy > 0) {
        showToast(
          `Оффлайн добыча: +${offlineCrystals} крист., +${offlineEnergy} энергии`,
          'success',
        )
      }
    } catch {
      // Игнорируем поврежденный save и используем дефолтный старт.
    } finally {
      isHydratedRef.current = true
    }
  }, [])

  useEffect(() => {
    const effectiveLevel = level + explorerLevel * 2
    setPlanets((prev) =>
      prev.map((planet) => ({
        ...planet,
        unlocked: effectiveLevel >= planet.unlockLevel,
      })),
    )
  }, [level, explorerLevel])

  useEffect(() => {
    const current = planets.find((planet) => planet.id === currentPlanetId)
    if (current?.unlocked) return
    const fallback = planets.find((planet) => planet.unlocked)
    if (fallback) setCurrentPlanetId(fallback.id)
  }, [currentPlanetId, planets])

  useEffect(() => {
    const today = getTodayKey()
    if (missionDay === today) return
    setMissionDay(today)
    setTapCount(0)
    setUpgradesBought(0)
    setMissionsClaimed({ taps: false, crystals: false, upgrades: false })
  }, [missionDay])

  useEffect(() => {
    const updateDailyStatus = () => {
      const source = Number(window.localStorage.getItem('lastClaim') || lastClaimAt || 0)
      setCanClaimDaily(Date.now() - source >= BALANCE.daily.cooldownMs)
    }
    updateDailyStatus()
    const timer = window.setInterval(updateDailyStatus, 60000)
    return () => window.clearInterval(timer)
  }, [lastClaimAt])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveEvent((prev) => {
        if (!prev) return null
        return Date.now() >= prev.endAt ? null : prev
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    // Рандомные галактические события каждые 5-15 минут.
    if (!walletConnected) return
    let cancelled = false
    let timerId = 0

    const schedule = () => {
      const delay =
        (BALANCE.events.minDelayMin +
          Math.random() * (BALANCE.events.maxDelayMin - BALANCE.events.minDelayMin)) *
        60 *
        1000
      timerId = window.setTimeout(() => {
        if (cancelled) return
        if (Math.random() < BALANCE.events.triggerChance) {
          const roll = Math.random()
          if (roll < BALANCE.events.meteorRoll) {
            const now = Date.now()
            setActiveEvent({
              type: 'meteor',
              title: 'Метеоритный шторм',
              description: 'Тап x2 на 60 секунд',
              endAt: now + BALANCE.events.meteorDurationMs,
            })
            showEventNotice('Метеоритный шторм', 'Тап x2 на 60 секунд')
            showToast('Событие: метеоритный шторм', 'success')
          } else if (roll < BALANCE.events.anomalyRoll) {
            const now = Date.now()
            setActiveEvent({
              type: 'anomaly',
              title: 'Пространственная аномалия',
              description: 'Пассив x0.5, но шанс пыли повышен',
              endAt: now + BALANCE.events.anomalyDurationMs,
            })
            showEventNotice(
              'Пространственная аномалия',
              'Пассив x0.5, но шанс звёздной пыли повышен',
            )
            showToast('Событие: пространственная аномалия', 'info')
          } else {
            setFreeUpgradeTokens((prev) => prev + 1)
            showEventNotice('Древний артефакт', 'Получен бесплатный апгрейд')
            showToast('Артефакт найден: +1 бесплатный апгрейд', 'success')
          }
        }
        schedule()
      }, delay)
    }

    schedule()
    return () => {
      cancelled = true
      window.clearTimeout(timerId)
    }
  }, [walletConnected])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setExpeditions((prev) => {
        let changed = false
        const next = prev.map((item) => {
          if (item.status !== 'running') return item
          if (Date.now() >= item.endAt) {
            changed = true
            return { ...item, status: 'ready' as const }
          }
          return item
        })
        return changed ? next : prev
      })
    }, 5000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const readyCount = expeditions.filter((item) => item.status === 'ready').length
    if (readyCount > 0) showToast(`Экспедиций готово: ${readyCount}`, 'success')
  }, [expeditions])

  useEffect(() => {
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
      currentPlanetId,
      planets,
      ships,
      expeditions,
      freeUpgradeTokens,
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
    currentPlanetId,
    planets,
    ships,
    expeditions,
    freeUpgradeTokens,
  ])

  useEffect(() => {
    if (!walletConnected) return
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
  }, [passiveIncome, walletConnected])

  useEffect(() => {
    if (!walletConnected) return
    const timer = window.setInterval(() => {
      energyBufferRef.current += energyMultiplier
      const readyEnergy = Math.floor(energyBufferRef.current)
      if (readyEnergy > 0) {
        energyBufferRef.current -= readyEnergy
        setEnergy((prev) => prev + readyEnergy)
      }
    }, ENERGY_TICK_MS)
    return () => window.clearInterval(timer)
  }, [energyMultiplier, walletConnected])

  useEffect(() => {
    if (!isHydratedRef.current) return
    const nextLevel = calculateLevel(totalEarned)
    if (nextLevel <= level) return
    const diff = nextLevel - level
    const reward = diff * BALANCE.level.rewardPerLevel
    setLevel(nextLevel)
    setCrystals((prev) => prev + reward)
    setTotalEarned((prev) => prev + reward)
    showToast(`Уровень ${nextLevel}! Бонус +${reward} кристаллов`, 'success')
  }, [level, totalEarned])

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current)
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      if (eventNoticeTimerRef.current)
        window.clearTimeout(eventNoticeTimerRef.current)
    }
  }, [])

  const spawnParticles = (x: number, y: number) => {
    const count = 4 + Math.floor(Math.random() * 3)
    const createdParticles: AsteroidParticle[] = Array.from({ length: count }, () => ({
      id: particleIdRef.current++,
      x,
      y,
      size: 8 + Math.floor(Math.random() * 8),
      dx: Math.floor(Math.random() * 100 - 50),
      dy: Math.floor(Math.random() * 100 - 50),
    }))
    setParticles((prev) => [...prev, ...createdParticles])
    window.setTimeout(() => {
      setParticles((prev) =>
        prev.filter(
          (particle) =>
            !createdParticles.some((created) => created.id === particle.id),
        ),
      )
    }, 800)
  }

  const handleBaseTap = () => {
    setCrystals((prev) => prev + 1)
    setTotalEarned((prev) => prev + 1)
    setIsTapBurst(true)
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current)
    burstTimerRef.current = window.setTimeout(() => setIsTapBurst(false), 200)
  }

  const handlePlanetTap = (x: number, y: number) => {
    const gain = tapPower * activePlanet.tapBonus.crystals * eventTapMultiplier
    const roundedGain = Math.max(1, Math.floor(gain))
    setCrystals((prev) => prev + roundedGain)
    setTotalEarned((prev) => prev + roundedGain)
    setTapCount((prev) => prev + 1)
    setIsTapBurst(true)
    spawnParticles(x, y)

    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current)
    burstTimerRef.current = window.setTimeout(() => setIsTapBurst(false), 200)

    const energyDropChance =
      BALANCE.drops.baseEnergyChance + activePlanet.tapBonus.energyChance
    if (energy > 0 && Math.random() < energyDropChance) {
      setEnergy((prev) => prev + 1)
      showToast('+1 энергия (дроп)', 'success')
    }

    const finalStardustChance =
      stardustChance +
      activePlanet.tapBonus.stardustChance +
      harvesterLevel * BALANCE.drops.harvesterStardustPerLevel +
      anomalyStardustBonus
    if (level >= 8 && Math.random() < finalStardustChance / 100) {
      setStardust((prev) => prev + 1)
      showToast('+1 звёздная пыль!', 'success')
    }
  }

  const spendForUpgrade = (cost: number): boolean => {
    if (freeUpgradeTokens > 0) {
      setFreeUpgradeTokens((prev) => prev - 1)
      return true
    }
    if (crystals < cost) return false
    setCrystals((prev) => prev - cost)
    return true
  }

  const buyPassiveUpgrade = () => {
    if (!spendForUpgrade(costPassive)) return
    setPassivePerTick((prev) => prev + BALANCE.shop.passive.passiveAdd)
    setMultiplier((prev) => prev + BALANCE.shop.passive.multiplierAdd)
    setUpgradesBought((prev) => prev + 1)
    showToast('Улучшение куплено: Ускорить пассив', 'success')
  }

  const buyTapUpgrade = () => {
    if (!spendForUpgrade(costTap)) return
    setTapPower((prev) => prev + BALANCE.shop.tap.tapAdd)
    setUpgradesBought((prev) => prev + 1)
    showToast('Улучшение куплено: Увеличить тап', 'success')
  }

  const buyEnergyUpgrade = () => {
    if (level < 3) return
    if (!spendForUpgrade(costEnergy)) return
    setEnergyMultiplier((prev) => prev + BALANCE.shop.energy.multiplierAdd)
    setUpgradesBought((prev) => prev + 1)
    showToast('Улучшение куплено: Энергия бустер', 'success')
  }

  const buyRareDropUpgrade = () => {
    if (level < 6) return
    if (!spendForUpgrade(costRare)) return
    setStardustChance((prev) => prev + BALANCE.shop.rare.chanceAdd)
    setUpgradesBought((prev) => prev + 1)
    showToast('Улучшение куплено: Редкий дроп', 'success')
  }

  const upgradeShip = (shipId: string) => {
    const ship = ships.find((item) => item.id === shipId)
    if (!ship) return
    const cost = getShipCost(ship.id, ship.level)
    if (!spendForUpgrade(cost)) return
    setShips((prev) =>
      prev.map((item) =>
        item.id === shipId ? { ...item, level: item.level + 1 } : item,
      ),
    )
    setUpgradesBought((prev) => prev + 1)
    showToast(`Корабль улучшен: ${ship.name}`, 'success')
  }

  const claimDailyBonus = () => {
    if (!canClaimDaily) return
    const reward = BALANCE.daily.rewardPerLevel * level
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
    showToast(`Миссия: +${tapMissionReward} кристаллов`, 'success')
  }

  const claimMissionCrystals = () => {
    if (!missionCrystalsDone || missionsClaimed.crystals) return
    setMissionsClaimed((prev) => ({ ...prev, crystals: true }))
    setEnergy((prev) => prev + crystalsMissionEnergyReward)
    showToast(`Миссия: +${crystalsMissionEnergyReward} энергия`, 'success')
  }

  const claimMissionUpgrades = () => {
    if (!missionUpgradesDone || missionsClaimed.upgrades) return
    setMissionsClaimed((prev) => ({ ...prev, upgrades: true }))
    setCrystals((prev) => prev + upgradesMissionReward)
    setTotalEarned((prev) => prev + upgradesMissionReward)
    showToast(`Миссия: +${upgradesMissionReward} кристаллов`, 'success')
  }

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      showToast('Реферальная ссылка скопирована', 'success')
    } catch {
      showToast('Не удалось скопировать ссылку', 'info')
    }
  }

  const sendExpedition = () => {
    if (!selectedShipId) return
    const ship = ships.find((item) => item.id === selectedShipId)
    if (!ship || ship.level <= 0) return

    const hasRunning = expeditions.some(
      (item) => item.shipId === selectedShipId && item.status === 'running',
    )
    if (hasRunning) {
      showToast('Этот корабль уже в экспедиции', 'info')
      return
    }

    const unlockedCount = unlockedPlanets.length
    const baseReward = Math.floor(
      (ship.level + unlockedCount) *
        selectedDuration *
        BALANCE.expedition.rewardBaseFactor,
    )
    const reward: ExpeditionRecord['reward'] = {
      crystals: baseReward,
      energy: Math.max(
        1,
        Math.floor((ship.level * selectedDuration) / BALANCE.expedition.energyDivider),
      ),
      stardust: Math.max(
        0,
        Math.floor(
          (ship.level * selectedDuration) / BALANCE.expedition.stardustDivider,
        ),
      ),
      artifact: Math.random() < BALANCE.expedition.artifactChance,
    }

    const now = Date.now()
    const newExpedition: ExpeditionRecord = {
      id: `exp-${now}-${Math.floor(Math.random() * 1000)}`,
      shipId: ship.id,
      shipName: ship.name,
      durationHours: selectedDuration,
      endAt: now + selectedDuration * 60 * 60 * 1000,
      status: 'running',
      reward,
    }
    setExpeditions((prev) => [newExpedition, ...prev])
    showToast(`Экспедиция отправлена: ${ship.name}`, 'success')
  }

  const claimExpedition = (expeditionId: string) => {
    const target = expeditions.find((item) => item.id === expeditionId)
    if (!target || target.status !== 'ready') return

    setCrystals((prev) => prev + target.reward.crystals)
    setEnergy((prev) => prev + target.reward.energy)
    setStardust((prev) => prev + target.reward.stardust)
    setTotalEarned((prev) => prev + target.reward.crystals)
    if (target.reward.artifact) setFreeUpgradeTokens((prev) => prev + 1)

    setExpeditions((prev) =>
      prev.map((item) =>
        item.id === expeditionId ? { ...item, status: 'claimed' } : item,
      ),
    )
    showToast('Награда экспедиции получена', 'success')
  }

  return (
    <main className="space-bg min-h-[100svh] w-full px-4 py-6 text-white sm:px-6">
      <section className="relative mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-5xl flex-col rounded-3xl border border-white/10 bg-slate-950/40 p-5 backdrop-blur-xl shadow-[0_0_90px_rgba(20,130,255,0.2)] sm:p-8">
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
          <div className="mx-auto mt-6 w-full max-w-xl rounded-2xl border border-cyan-300/20 bg-slate-900/60 p-4 text-center">
            <p className="text-sm text-slate-200">
              Подключи кошелёк TON для сохранения прогресса и открытия продвинутых механик
            </p>
            <p className="mt-3 text-lg font-semibold text-cyan-100">
              Базовый режим: 💎 {crystals}
            </p>
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleBaseTap}
                className={`asteroid ${isTapBurst ? 'tap-burst' : ''}`}
              >
                <span className="planet-emoji">☀️</span>
              </button>
            </div>
          </div>
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
              currentPlanetName={activePlanet.name}
              currentPlanetPassive={activePlanet.passiveMultiplier}
              freeUpgradeTokens={freeUpgradeTokens}
            />

            <PlanetMap
              planets={planets}
              activePlanetId={currentPlanetId}
              ships={ships}
              isTapBurst={isTapBurst}
              particles={particles}
              onSelectPlanet={setCurrentPlanetId}
              onTapPlanet={handlePlanetTap}
            />

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-2 md:grid-cols-5">
              <button
                type="button"
                onClick={() => setActiveTab('shop')}
                className={`tab-btn ${activeTab === 'shop' ? 'tab-btn-active' : ''}`}
              >
                Магазин
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fleet')}
                className={`tab-btn ${activeTab === 'fleet' ? 'tab-btn-active' : ''}`}
              >
                Флот
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('expeditions')}
                className={`tab-btn ${activeTab === 'expeditions' ? 'tab-btn-active' : ''}`}
              >
                Экспедиции
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

            {activeTab === 'fleet' && (
              <Fleet
                crystals={crystals}
                ships={ships}
                onUpgradeShip={upgradeShip}
                getShipCost={getShipCost}
              />
            )}

            {activeTab === 'expeditions' && (
              <Expedition
                ships={ships}
                expeditions={expeditions}
                selectedShipId={selectedShipId}
                selectedDuration={selectedDuration}
                onSelectShip={setSelectedShipId}
                onSelectDuration={setSelectedDuration}
                onSendExpedition={sendExpedition}
                onClaimExpedition={claimExpedition}
              />
            )}

            {activeTab === 'missions' && (
              <Missions
                level={level}
                canClaimDaily={canClaimDaily}
                dailyReward={BALANCE.daily.rewardPerLevel * level}
                dailyCooldown={getTimeLeftText(lastClaimAt)}
                missionTapDone={missionTapDone}
                missionTapProgress={tapCount}
                missionTapClaimed={missionsClaimed.taps}
                missionTapReward={tapMissionReward}
                missionCrystalsDone={missionCrystalsDone}
                missionCrystalsProgress={Math.min(crystals, BALANCE.missions.crystalsGoal)}
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

        <EventNotification
          title={eventNotice?.title ?? ''}
          description={eventNotice?.description ?? ''}
          visible={Boolean(eventNotice?.visible)}
        />

        {toast && (
          <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-info'}`}>
            {toast.text}
          </div>
        )}
      </section>
    </main>
  )
}

export default App
