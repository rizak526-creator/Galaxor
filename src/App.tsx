import { Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { init, miniApp, retrieveLaunchParams, viewport } from '@tma.js/sdk'
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react'
import type { AsteroidParticle } from './components/Asteroid'
import type { Artifact } from './components/ArtifactGallery'
import { EventNotification } from './components/EventNotification'
import type { ExpeditionRecord } from './components/Expedition'
import { MiniGame } from './components/MiniGame'
import type { MiniGameDifficulty } from './components/MiniGame'
import { NarrativeModal } from './components/NarrativeModal'
import { PlanetMap } from './components/PlanetMap'
import type { FleetShip, Planet } from './components/PlanetMap'
import { Stats } from './components/Stats'
import { BALANCE } from './game/balance'
import { askAiAdvisor } from './services/aiClient'

const LazyShop = lazy(() =>
  import('./components/Shop').then((module) => ({ default: module.Shop })),
)
const LazyFleet = lazy(() =>
  import('./components/Fleet').then((module) => ({ default: module.Fleet })),
)
const LazyExpedition = lazy(() =>
  import('./components/Expedition').then((module) => ({ default: module.Expedition })),
)
const LazyMissions = lazy(() =>
  import('./components/Missions').then((module) => ({ default: module.Missions })),
)
const LazyReferral = lazy(() =>
  import('./components/Referral').then((module) => ({ default: module.Referral })),
)
const LazyArtifactGallery = lazy(() =>
  import('./components/ArtifactGallery').then((module) => ({ default: module.ArtifactGallery })),
)
const LazyAIPanel = lazy(() =>
  import('./components/AIPanel').then((module) => ({ default: module.AIPanel })),
)
const LazyCommandCenter = lazy(() =>
  import('./components/CommandCenter').then((module) => ({ default: module.CommandCenter })),
)
const LazyPlanetScene3D = lazy(() =>
  import('./components/PlanetScene3D').then((module) => ({ default: module.PlanetScene3D })),
)
const LazyPlanetSceneBabylon = lazy(() =>
  import('./components/PlanetSceneBabylon').then((module) => ({ default: module.PlanetSceneBabylon })),
)

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
  type: 'meteor' | 'anomaly' | 'supernova'
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
  currentChapter: number
  artifactCollection: string[]
  historyLog: string[]
  miniGameActiveUntil: number
  miniGameCooldownUntil: number
  miniGameDifficultyByPlanet: Record<string, MiniGameDifficulty>
  setBonuses: {
    epochSet: boolean
    fullSet: boolean
  }
  factionRep: {
    union: number
    syndicate: number
    keepers: number
  }
  storyIndex: number
  storyHistory: string[]
  passPremium: boolean
  passClaimedFree: number[]
  passClaimedPremium: number[]
  cosmeticsOwned: string[]
  uiDensity: 'compact' | 'comfortable'
}

type ToastType = 'info' | 'success'
type TabType =
  | 'shop'
  | 'missions'
  | 'referral'
  | 'fleet'
  | 'expeditions'
  | 'artifacts'
  | 'history'
  | 'command'
  | 'ai'

const PASSIVE_TICK_MS = BALANCE.tick.passiveMs
const ENERGY_TICK_MS = BALANCE.tick.energyMs
const MAX_OFFLINE_MS = BALANCE.offline.maxMs
const ASSET_BASE = import.meta.env.BASE_URL

function envFlag(name: string, fallback: boolean): boolean {
  const value = import.meta.env[name]
  if (value === undefined) return fallback
  return String(value).toLowerCase() === 'true'
}

const PLANETS_TEMPLATE: Planet[] = [
  {
    id: 'earth-like',
    name: 'Терра Нова',
    subtitle: 'Стабильные залежи кристаллов и мягкий климат',
    unlocked: true,
    unlockLevel: 1,
    passiveMultiplier: 1.0,
    tapBonus: { crystals: 1.0, energyChance: 0, stardustChance: 0 },
    objectClass: 'planet-earth',
    icon: `${ASSET_BASE}assets/planets/earth-like.svg`,
  },
  {
    id: 'gas-giant',
    name: 'Янтарный Титан',
    subtitle: 'Газовые вихри усиливают генераторы добычи',
    unlocked: true,
    unlockLevel: 3,
    passiveMultiplier: 1.5,
    tapBonus: { crystals: 1.1, energyChance: 0.02, stardustChance: 0 },
    objectClass: 'planet-gas',
    icon: `${ASSET_BASE}assets/planets/gas-giant.svg`,
  },
  {
    id: 'nebula',
    name: 'Туманность Лиры',
    subtitle: 'Туманность замедляет добычу, но насыщает поле энергией',
    unlocked: true,
    unlockLevel: 5,
    passiveMultiplier: 0.8,
    tapBonus: { crystals: 1.0, energyChance: 0.05, stardustChance: 0.2 },
    objectClass: 'planet-nebula',
    icon: `${ASSET_BASE}assets/planets/nebula.svg`,
  },
  {
    id: 'black-hole',
    name: 'Сингулярность Эреба',
    subtitle: 'Сильная гравитация резко повышает общий пассив',
    unlocked: true,
    unlockLevel: 8,
    passiveMultiplier: 2.2,
    tapBonus: { crystals: 1.25, energyChance: 0.01, stardustChance: 0.4 },
    objectClass: 'planet-blackhole',
    icon: `${ASSET_BASE}assets/planets/black-hole.svg`,
  },
  {
    id: 'ice-world',
    name: 'Крион',
    subtitle: 'Ледяные шахты стабильно питают добывающие установки',
    unlocked: true,
    unlockLevel: 12,
    passiveMultiplier: 1.8,
    tapBonus: { crystals: 1.15, energyChance: 0.03, stardustChance: 0.6 },
    objectClass: 'planet-ice',
    icon: `${ASSET_BASE}assets/planets/ice-world.svg`,
  },
  {
    id: 'ancient-ruins',
    name: 'Руины Предтеч',
    subtitle: 'Древние руины усиливают резонанс звёздной пыли',
    unlocked: true,
    unlockLevel: 18,
    passiveMultiplier: 3.0,
    tapBonus: { crystals: 1.1, energyChance: 0.02, stardustChance: 3.0 },
    objectClass: 'planet-ruins',
    icon: `${ASSET_BASE}assets/planets/ancient-ruins.svg`,
  },
]

const SHIPS_TEMPLATE: FleetShip[] = [
  {
    id: 'mining-drone',
    name: 'Mining Drone',
    icon: `${ASSET_BASE}assets/ships/mining-drone.svg`,
    level: 0,
  },
  {
    id: 'explorer-scout',
    name: 'Explorer Scout',
    icon: `${ASSET_BASE}assets/ships/explorer-scout.svg`,
    level: 0,
  },
  {
    id: 'harvester-probe',
    name: 'Harvester Probe',
    icon: `${ASSET_BASE}assets/ships/harvester-probe.svg`,
    level: 0,
  },
]

const CHAPTERS = [
  {
    id: 1,
    title: 'Глава 1: Awakening',
    story: 'Первые сканеры запущены. Ты пробуждаешь спящую добывающую империю.',
    voiceLine: 'ИИ-коммандер: Системы активированы. Добро пожаловать, капитан.',
  },
  {
    id: 2,
    title: 'Глава 2: Expansion',
    story: 'Флот набирает мощь, и империя расширяет влияние на соседние системы.',
    voiceLine: 'ИИ-коммандер: Экспансия подтверждена. Новые рубежи ждут.',
  },
  {
    id: 3,
    title: 'Глава 3: Rift Frontier',
    story: 'Аномалии открывают рифты. За ними скрыты редкие ресурсы и опасности.',
    voiceLine: 'ИИ-коммандер: Рифты нестабильны. Держи курс и не дрейфуй.',
  },
  {
    id: 4,
    title: 'Глава 4: Relic Wars',
    story: 'Древние руины пробуждаются. Артефакты меняют правила галактической игры.',
    voiceLine: 'ИИ-коммандер: Реликвии откликаются. Война за наследие началась.',
  },
  {
    id: 5,
    title: 'Глава 5: Stellar Dominion',
    story: 'Империя входит в эпоху звёздного господства. Осталось удержать баланс сил.',
    voiceLine: 'ИИ-коммандер: Звёздное господство достигнуто. Командование в твоих руках.',
  },
] as const

const STORY_OPS = [
  {
    id: 'rift-caravan',
    title: 'Рифт-караван',
    description: 'Торговцы застряли на границе рифта и просят сопровождение.',
    choices: [
      {
        id: 'escort',
        title: 'Дать эскорт',
        outcome: '+180 крист., +8 репутации Союза',
        crystals: 180,
        stardust: 0,
        rep: { union: 8, syndicate: -2, keepers: 1 },
      },
      {
        id: 'tax',
        title: 'Взять пошлину',
        outcome: '+70 крист., +3 пыли, +8 репутации Синдиката',
        crystals: 70,
        stardust: 3,
        rep: { union: -3, syndicate: 8, keepers: 0 },
      },
    ],
  },
  {
    id: 'ancient-signal',
    title: 'Сигнал Предтеч',
    description: 'Из руин поступает шифр с координатами скрытого хранилища.',
    choices: [
      {
        id: 'research',
        title: 'Передать Хранителям',
        outcome: '+4 энергии, +7 репутации Хранителей',
        crystals: 0,
        stardust: 2,
        energy: 4,
        rep: { union: 0, syndicate: -2, keepers: 7 },
      },
      {
        id: 'raid',
        title: 'Штурмовать сразу',
        outcome: '+260 крист., но -4 репутации Хранителей',
        crystals: 260,
        stardust: 0,
        rep: { union: 1, syndicate: 3, keepers: -4 },
      },
    ],
  },
  {
    id: 'starport-strike',
    title: 'Забастовка доков',
    description: 'Верфи остановили производство. Нужно принять сторону.',
    choices: [
      {
        id: 'support-workers',
        title: 'Поддержать рабочих',
        outcome: '+6 энергии, +6 Союз, -2 Синдикат',
        crystals: 90,
        stardust: 0,
        energy: 6,
        rep: { union: 6, syndicate: -2, keepers: 0 },
      },
      {
        id: 'support-owners',
        title: 'Поддержать владельцев',
        outcome: '+240 крист., +6 Синдикат',
        crystals: 240,
        stardust: 0,
        rep: { union: -3, syndicate: 6, keepers: 0 },
      },
    ],
  },
] as const

const PASS_MILESTONES = [1, 3, 5, 7, 10, 13, 16] as const

const COSMETIC_CATALOG = [
  {
    id: 'orbit-aurora',
    name: 'Аурора орбит',
    price: 14,
    description: 'Более яркие орбитальные следы и мягкий glow.',
  },
  {
    id: 'captain-title',
    name: 'Титул "Звёздный Архонт"',
    price: 18,
    description: 'Косметический титул в профиле пилота.',
  },
  {
    id: 'hud-crystal',
    name: 'Кристаллический HUD',
    price: 24,
    description: 'Новый визуальный стиль интерфейса в холодных тонах.',
  },
] as const

const ARTIFACTS_POOL: Artifact[] = [
  {
    id: 'core-lens',
    name: 'Линза ядра',
    epoch: 'Awakening',
    rarity: 'common',
    description: 'Фокусирует кристаллические потоки.',
    bonusLabel: '+0.2 к passivePerTick',
    icon: '🔶',
  },
  {
    id: 'quantum-anchor',
    name: 'Квантовый якорь',
    epoch: 'Expansion',
    rarity: 'rare',
    description: 'Стабилизирует маршруты экспедиций.',
    bonusLabel: '+6% к награде экспедиций',
    icon: '⚓',
  },
  {
    id: 'void-compass',
    name: 'Компас Пустоты',
    epoch: 'Rift Frontier',
    rarity: 'epic',
    description: 'Навигация по тёмным секторам.',
    bonusLabel: '+0.6% к шансу пыли',
    icon: '🧭',
  },
  {
    id: 'stellar-seed',
    name: 'Звёздное семя',
    epoch: 'Stellar Dominion',
    rarity: 'legendary',
    description: 'Сгусток древней энергии.',
    bonusLabel: '+10% к пассивному доходу',
    icon: '🌟',
  },
  {
    id: 'nebula-thread',
    name: 'Нить туманности',
    epoch: 'Rift Frontier',
    rarity: 'rare',
    description: 'Остаток живой туманности.',
    bonusLabel: '+0.4 к энергии за тик',
    icon: '🪢',
  },
  {
    id: 'time-fragment',
    name: 'Фрагмент времени',
    epoch: 'Expansion',
    rarity: 'epic',
    description: 'Искажает локальный темп добычи.',
    bonusLabel: 'События происходят чаще',
    icon: '⏳',
  },
  {
    id: 'black-halo',
    name: 'Чёрный ореол',
    epoch: 'Relic Wars',
    rarity: 'legendary',
    description: 'Ореол сингулярности.',
    bonusLabel: '+1.2% к шансу пыли',
    icon: '🕳️',
  },
  {
    id: 'ruin-seal',
    name: 'Печать руин',
    epoch: 'Relic Wars',
    rarity: 'common',
    description: 'Отклик древних цивилизаций.',
    bonusLabel: '+5% к награде миссий',
    icon: '🪬',
  },
  {
    id: 'ion-crown',
    name: 'Ионная корона',
    epoch: 'Awakening',
    rarity: 'rare',
    description: 'Усиливает коридоры дронов.',
    bonusLabel: '+0.2 к tapPower',
    icon: '👑',
  },
  {
    id: 'sun-shard',
    name: 'Солнечный осколок',
    epoch: 'Stellar Dominion',
    rarity: 'epic',
    description: 'Кристалл древней звезды.',
    bonusLabel: '+8% к daily бонусу',
    icon: '☀️',
  },
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
  const [currentChapter, setCurrentChapter] = useState(1)
  const [artifactCollection, setArtifactCollection] = useState<string[]>([])
  const [historyLog, setHistoryLog] = useState<string[]>([])
  const [miniGameActiveUntil, setMiniGameActiveUntil] = useState(0)
  const [miniGameCooldownUntil, setMiniGameCooldownUntil] = useState(0)
  const [miniGameDifficultyByPlanet, setMiniGameDifficultyByPlanet] = useState<
    Record<string, MiniGameDifficulty>
  >({})
  const [setBonuses, setSetBonuses] = useState({ epochSet: false, fullSet: false })

  const [activeTab, setActiveTab] = useState<TabType>('shop')
  const [isTapBurst, setIsTapBurst] = useState(false)
  const [tapBurstTick, setTapBurstTick] = useState(0)
  const [particles, setParticles] = useState<AsteroidParticle[]>([])
  const [factionRep, setFactionRep] = useState({
    union: 0,
    syndicate: 0,
    keepers: 0,
  })
  const [storyIndex, setStoryIndex] = useState(0)
  const [storyHistory, setStoryHistory] = useState<string[]>([])
  const [passPremium, setPassPremium] = useState(false)
  const [passClaimedFree, setPassClaimedFree] = useState<number[]>([])
  const [passClaimedPremium, setPassClaimedPremium] = useState<number[]>([])
  const [cosmeticsOwned, setCosmeticsOwned] = useState<string[]>([])
  const [uiDensity, setUiDensity] = useState<'compact' | 'comfortable'>('comfortable')
  const [toast, setToast] = useState<{ text: string; type: ToastType } | null>(
    null,
  )
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null)
  const [eventNotice, setEventNotice] = useState<{
    title: string
    description: string
    visible: boolean
  } | null>(null)
  const [narrativeModal, setNarrativeModal] = useState<{
    title: string
    description: string
    visible: boolean
  } | null>(null)
  const [screenFlash, setScreenFlash] = useState(false)
  const [friendsCount] = useState(4)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState('')
  const [aiError, setAiError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const particleIdRef = useRef(1)
  const burstTimerRef = useRef<number | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const eventNoticeTimerRef = useRef<number | null>(null)
  const flashTimerRef = useRef<number | null>(null)
  const shakeTimerRef = useRef<number | null>(null)
  const isHydratedRef = useRef(false)
  const passiveBufferRef = useRef(0)
  const energyBufferRef = useRef(0)
  const starterStageRef = useRef<HTMLDivElement | null>(null)
  const starterHitRef = useRef<HTMLDivElement | null>(null)
  const starterCameraTargetRef = useRef({ x: 0, y: 0 })
  const starterLastInputAtRef = useRef(0)
  const referralLink = `https://t.me/Galaxor_bot?start=ref_${userId}`
  const walletConnected = Boolean(tonAddress)
  const activeChapter = CHAPTERS[currentChapter - 1] ?? CHAPTERS[0]
  const [screenShake, setScreenShake] = useState(false)
  const releaseMode = envFlag('VITE_RELEASE_MODE', false)
  const planetEngineMode = (import.meta.env.VITE_PLANET_ENGINE ?? 'babylon').toLowerCase()
  const useBabylonPlanet = planetEngineMode !== 'three'
  const reducedEffects =
    releaseMode ||
    (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const explorerLevel = ships.find((ship) => ship.id === 'explorer-scout')?.level ?? 0
  const miningLevel = ships.find((ship) => ship.id === 'mining-drone')?.level ?? 0
  const harvesterLevel = ships.find((ship) => ship.id === 'harvester-probe')?.level ?? 0

  const activePlanet =
    planets.find((planet) => planet.id === currentPlanetId) ?? planets[0]
  const starterPlanetId = 'gas-giant'
  const starterSceneShips: FleetShip[] = useMemo(
    () => [
      {
        id: 'mining-drone',
        name: 'Bronze Escort',
        icon: `${ASSET_BASE}assets/ships/mining-drone.svg`,
        level: 4,
      },
      {
        id: 'explorer-scout',
        name: 'Bronze Scout',
        icon: `${ASSET_BASE}assets/ships/explorer-scout.svg`,
        level: 3,
      },
      {
        id: 'harvester-probe',
        name: 'Bronze Relay',
        icon: `${ASSET_BASE}assets/ships/harvester-probe.svg`,
        level: 2,
      },
    ],
    [],
  )
  const unlockedPlanets = planets.filter((planet) => planet.unlocked)
  const hasFullArtifactSet = artifactCollection.length >= ARTIFACTS_POOL.length
  const artifactPassiveBonus = artifactCollection.includes('core-lens') ? 0.2 : 0
  const artifactTapBonus = artifactCollection.includes('ion-crown') ? 0.2 : 0
  const artifactStardustBonus =
    (artifactCollection.includes('void-compass') ? 0.6 : 0) +
    (artifactCollection.includes('black-halo') ? 1.2 : 0)
  const artifactEnergyTickBonus = artifactCollection.includes('nebula-thread')
    ? 0.4
    : 0
  const artifactExpeditionBonus = artifactCollection.includes('quantum-anchor')
    ? 1.06
    : 1
  const artifactDailyBonus = artifactCollection.includes('sun-shard') ? 1.08 : 1
  const artifactMissionBonus = artifactCollection.includes('ruin-seal') ? 1.05 : 1
  const eventFrequencyFactor = artifactCollection.includes('time-fragment') ? 0.8 : 1
  const miniGameActive = miniGameActiveUntil > Date.now()
  const miniGameRemainingSec = Math.max(
    0,
    Math.ceil((miniGameActiveUntil - Date.now()) / 1000),
  )
  const miniGameCooldownSec = Math.max(
    0,
    Math.ceil((miniGameCooldownUntil - Date.now()) / 1000),
  )
  const miniGameDifficulty = miniGameDifficultyByPlanet[currentPlanetId] ?? 'normal'

  let planetsPassiveSum = 0
  for (const planet of unlockedPlanets) planetsPassiveSum += planet.passiveMultiplier

  const fleetPassiveMultiplier = Math.pow(BALANCE.ships.passivePerLevel, miningLevel)
  const alliancePassiveMultiplier = friendsCount > 3 ? 1.05 : 1
  const eventTapMultiplier =
    activeEvent?.type === 'meteor' ? BALANCE.events.meteorTapMultiplier : 1
  const eventPassiveMultiplier = activeEvent?.type === 'supernova'
    ? 10
    : activeEvent?.type === 'anomaly'
      ? BALANCE.events.anomalyPassiveMultiplier
      : 1
  const anomalyStardustBonus =
    activeEvent?.type === 'anomaly' ? BALANCE.drops.anomalyStardustBonus : 0

  const passiveIncome =
    (passivePerTick + artifactPassiveBonus) *
    multiplier *
    Math.max(1, planetsPassiveSum) *
    fleetPassiveMultiplier *
    alliancePassiveMultiplier *
    eventPassiveMultiplier *
    (setBonuses.epochSet ? 1.1 : 1) *
    (setBonuses.fullSet ? 1.25 : 1) *
    (artifactCollection.includes('stellar-seed') ? 1.1 : 1)

  const leaderboardMock = [
    { name: 'NovaMiner', score: 28450 },
    { name: 'OrionPulse', score: 26230 },
    { name: 'AstraVex', score: 24110 },
    { name: 'Zenith-X', score: 22900 },
    { name: 'EchoRift', score: 21330 },
    { name: 'QuasarFox', score: 20110 },
    { name: 'TitanRay', score: 18920 },
    { name: 'VoidRanger', score: 17240 },
    { name: 'NebulaAxe', score: 16800 },
    { name: 'You', score: Math.floor(totalEarned) },
  ]

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

  const tapMissionReward = Math.floor(
    (BALANCE.missions.tapRewardBase + level * BALANCE.missions.tapRewardPerLevel) *
      artifactMissionBonus,
  )
  const upgradesMissionReward = Math.floor(
    BALANCE.missions.upgradesRewardBase +
      level * BALANCE.missions.upgradesRewardPerLevel * artifactMissionBonus,
  )
  const crystalsMissionEnergyReward =
    1 + Math.floor(level / BALANCE.missions.energyRewardPerLevelStep)

  const levelFloorBase = Math.pow(level - 1, 2) * BALANCE.level.divisor
  const nextLevelBase = Math.pow(level, 2) * BALANCE.level.divisor
  const levelProgress = Math.max(0, totalEarned - levelFloorBase)
  const levelProgressTotal = Math.max(1, nextLevelBase - levelFloorBase)
  const passPoints = Math.floor(totalEarned / 400) + Math.floor(tapCount / 40) + level * 2
  const passTier = Math.min(
    PASS_MILESTONES.length,
    PASS_MILESTONES.filter((point) => passPoints >= point * 10).length,
  )
  const activeStoryOp = STORY_OPS[storyIndex % STORY_OPS.length]
  const nextBestAction: { text: string; tab: TabType } =
    canClaimDaily
      ? { text: 'Забрать ежедневный бонус и ускорить прогресс.', tab: 'missions' }
      : stardust >= 14
        ? { text: 'Потратить пыль на косметику или премиум в командном центре.', tab: 'command' }
        : crystals >= costTap
          ? { text: 'Усилить тап в магазине для быстрого буста.', tab: 'shop' }
          : { text: 'Запусти экспедицию, чтобы накопить ресурсы оффлайн.', tab: 'expeditions' }

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

  const pushHistory = (entry: string) => {
    const stamp = new Date().toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    setHistoryLog((prev) => [`[${stamp}] ${entry}`, ...prev].slice(0, 60))
  }

  const tryUnlockArtifact = (source: string, chance: number) => {
    if (Math.random() >= chance) return false
    const locked = ARTIFACTS_POOL.filter(
      (artifact) => !artifactCollection.includes(artifact.id),
    )
    if (locked.length === 0) return false
    const picked = locked[Math.floor(Math.random() * locked.length)]
    setArtifactCollection((prev) => [...prev, picked.id])
    showToast(`Найден артефакт: ${picked.name}`, 'success')
    pushHistory(`Получен артефакт "${picked.name}" (${source})`)
    return true
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

  const applyStoryChoice = (choiceId: string) => {
    const picked = activeStoryOp.choices.find((choice) => choice.id === choiceId)
    if (!picked) return
    if (picked.crystals) {
      setCrystals((prev) => prev + picked.crystals)
      setTotalEarned((prev) => prev + picked.crystals)
    }
    const stardustGain = picked.stardust ?? 0
    const energyGain = 'energy' in picked ? picked.energy ?? 0 : 0
    if (stardustGain) setStardust((prev) => prev + stardustGain)
    if (energyGain) setEnergy((prev) => prev + energyGain)
    setFactionRep((prev) => ({
      union: prev.union + (picked.rep.union ?? 0),
      syndicate: prev.syndicate + (picked.rep.syndicate ?? 0),
      keepers: prev.keepers + (picked.rep.keepers ?? 0),
    }))
    setStoryHistory((prev) =>
      [`${activeStoryOp.title}: ${picked.title} (${picked.outcome})`, ...prev].slice(0, 18),
    )
    pushHistory(`Сценарий: ${activeStoryOp.title} -> ${picked.title}`)
    showToast(`Решение принято: ${picked.title}`, 'success')
    setStoryIndex((prev) => prev + 1)
  }

  const unlockPremiumPass = () => {
    if (passPremium) return
    const cost = 25
    if (stardust < cost) {
      showToast('Недостаточно звёздной пыли для Премиум-пропуска', 'info')
      return
    }
    setStardust((prev) => prev - cost)
    setPassPremium(true)
    pushHistory('Разблокирован Премиум-пропуск')
    showToast('Премиум-пропуск активирован', 'success')
  }

  const claimPassReward = (tier: number, premium: boolean) => {
    if (tier > passTier) {
      showToast('Этот уровень пропуска ещё не открыт', 'info')
      return
    }
    if (premium) {
      if (!passPremium) {
        showToast('Сначала активируй Премиум-пропуск', 'info')
        return
      }
      if (passClaimedPremium.includes(tier)) return
      setPassClaimedPremium((prev) => [...prev, tier])
      setStardust((prev) => prev + 2 + tier)
      setCrystals((prev) => prev + tier * 60)
      setTotalEarned((prev) => prev + tier * 60)
      pushHistory(`Получена премиум-награда пропуска: уровень ${tier}`)
      showToast(`Премиум-награда уровня ${tier} получена`, 'success')
      return
    }

    if (passClaimedFree.includes(tier)) return
    setPassClaimedFree((prev) => [...prev, tier])
    setCrystals((prev) => prev + tier * 40)
    setTotalEarned((prev) => prev + tier * 40)
    if (tier % 2 === 0) setEnergy((prev) => prev + 2)
    pushHistory(`Получена бесплатная награда пропуска: уровень ${tier}`)
    showToast(`Награда уровня ${tier} получена`, 'success')
  }

  const buyCosmetic = (cosmeticId: string, price: number) => {
    if (cosmeticsOwned.includes(cosmeticId)) return
    if (stardust < price) {
      showToast('Не хватает звёздной пыли', 'info')
      return
    }
    setStardust((prev) => prev - price)
    setCosmeticsOwned((prev) => [...prev, cosmeticId])
    pushHistory(`Куплена косметика: ${cosmeticId}`)
    showToast('Косметика приобретена', 'success')
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
      const savedPlanets = Array.isArray(parsed.planets) ? parsed.planets : []
      const savedShips = Array.isArray(parsed.ships) ? parsed.ships : []
      const savedPlanetById = new Map(savedPlanets.map((planet) => [planet.id, planet]))
      const savedShipById = new Map(savedShips.map((ship) => [ship.id, ship]))
      const basePlanets = PLANETS_TEMPLATE.map((planet) => {
        const saved = savedPlanetById.get(planet.id)
        if (!saved) return planet
        return {
          ...planet,
          unlocked: true,
        }
      })
      const baseShips = SHIPS_TEMPLATE.map((ship) => {
        const saved = savedShipById.get(ship.id)
        if (!saved) return ship
        return {
          ...ship,
          level: typeof saved.level === 'number' ? Math.max(0, Math.floor(saved.level)) : 0,
        }
      })
      const requestedPlanetId = parsed.currentPlanetId ?? PLANETS_TEMPLATE[0].id
      const baseCurrentPlanetId = basePlanets.some((planet) => planet.id === requestedPlanetId)
        ? requestedPlanetId
        : PLANETS_TEMPLATE[0].id
      const baseExpeditions = parsed.expeditions ?? []
      const baseFreeTokens = parsed.freeUpgradeTokens ?? 0
      const baseCurrentChapter = parsed.currentChapter ?? 1
      const baseArtifacts = parsed.artifactCollection ?? []
      const baseHistory = parsed.historyLog ?? []
      const baseMiniGameActiveUntil = parsed.miniGameActiveUntil ?? 0
      const baseMiniGameCooldownUntil = parsed.miniGameCooldownUntil ?? 0
      const baseMiniGameDifficultyByPlanet =
        parsed.miniGameDifficultyByPlanet ?? {}
      const baseSetBonuses = parsed.setBonuses ?? { epochSet: false, fullSet: false }
      const baseFactionRep = parsed.factionRep ?? { union: 0, syndicate: 0, keepers: 0 }
      const baseStoryIndex = parsed.storyIndex ?? 0
      const baseStoryHistory = parsed.storyHistory ?? []
      const basePassPremium = parsed.passPremium ?? false
      const basePassClaimedFree = parsed.passClaimedFree ?? []
      const basePassClaimedPremium = parsed.passClaimedPremium ?? []
      const baseCosmeticsOwned = parsed.cosmeticsOwned ?? []
      const baseUiDensity = parsed.uiDensity === 'compact' ? 'compact' : 'comfortable'

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
      setCurrentChapter(baseCurrentChapter)
      setArtifactCollection(baseArtifacts)
      setHistoryLog(baseHistory)
      setMiniGameActiveUntil(baseMiniGameActiveUntil)
      setMiniGameCooldownUntil(baseMiniGameCooldownUntil)
      setMiniGameDifficultyByPlanet(baseMiniGameDifficultyByPlanet)
      setSetBonuses(baseSetBonuses)
      setFactionRep(baseFactionRep)
      setStoryIndex(baseStoryIndex)
      setStoryHistory(baseStoryHistory)
      setPassPremium(basePassPremium)
      setPassClaimedFree(basePassClaimedFree)
      setPassClaimedPremium(basePassClaimedPremium)
      setCosmeticsOwned(baseCosmeticsOwned)
      setUiDensity(baseUiDensity)

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
    setPlanets((prev) =>
      prev.map((planet) => ({
        ...planet,
        unlocked: true,
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
        1000 *
        eventFrequencyFactor
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
            tryUnlockArtifact('событие', 0.35)
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
  }, [walletConnected, eventFrequencyFactor])

  useEffect(() => {
    if (!walletConnected) return
    const timer = window.setInterval(() => {
      if (Math.random() < 0.01) {
        const now = Date.now()
        setActiveEvent({
          type: 'supernova',
          title: 'Supernova',
          description: 'Сверхновая: пассив x10 на 30 секунд',
          endAt: now + 30000,
        })
        setNarrativeModal({
          title: 'Supernova!',
          description: 'Сверхновая вспыхнула в секторе. Пассивный доход x10 на 30 секунд.',
          visible: true,
        })
        if (!reducedEffects) {
          setScreenFlash(true)
          setScreenShake(true)
        }
        if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
        flashTimerRef.current = window.setTimeout(
          () => setScreenFlash(false),
          reducedEffects ? 300 : 700,
        )
        if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current)
        shakeTimerRef.current = window.setTimeout(
          () => setScreenShake(false),
          reducedEffects ? 250 : 700,
        )
        pushHistory('Событие Supernova активировано')
        showToast('Supernova: пассив x10', 'success')
      }
    }, 60000)
    return () => window.clearInterval(timer)
  }, [reducedEffects, walletConnected])

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
    const ownedArtifacts = ARTIFACTS_POOL.filter((artifact) =>
      artifactCollection.includes(artifact.id),
    )
    const epochCounters: Record<string, number> = {}
    for (const artifact of ownedArtifacts) {
      epochCounters[artifact.epoch] = (epochCounters[artifact.epoch] ?? 0) + 1
    }
    const hasEpochSet = Object.values(epochCounters).some((count) => count >= 3)
    setSetBonuses({
      epochSet: hasEpochSet,
      fullSet: hasFullArtifactSet,
    })
  }, [artifactCollection, hasFullArtifactSet])

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
      currentChapter,
      artifactCollection,
      historyLog,
      miniGameActiveUntil,
      miniGameCooldownUntil,
      miniGameDifficultyByPlanet,
      setBonuses,
      factionRep,
      storyIndex,
      storyHistory,
      passPremium,
      passClaimedFree,
      passClaimedPremium,
      cosmeticsOwned,
      uiDensity,
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
    currentChapter,
    artifactCollection,
    historyLog,
    miniGameActiveUntil,
    miniGameCooldownUntil,
    miniGameDifficultyByPlanet,
    setBonuses,
    factionRep,
    storyIndex,
    storyHistory,
    passPremium,
    passClaimedFree,
    passClaimedPremium,
    cosmeticsOwned,
    uiDensity,
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
      energyBufferRef.current += energyMultiplier + artifactEnergyTickBonus
      const readyEnergy = Math.floor(energyBufferRef.current)
      if (readyEnergy > 0) {
        energyBufferRef.current -= readyEnergy
        setEnergy((prev) => prev + readyEnergy)
      }
    }, ENERGY_TICK_MS)
    return () => window.clearInterval(timer)
  }, [energyMultiplier, walletConnected, artifactEnergyTickBonus])

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
    if (!isHydratedRef.current) return
    const nextChapter = Math.min(Math.floor(level / 5) + 1, CHAPTERS.length)
    if (nextChapter <= currentChapter) return
    const chapterData = CHAPTERS[nextChapter - 1]
    const chapterCrystalBonus = nextChapter * 300
    const chapterEnergyBonus = nextChapter * 4
    setCurrentChapter(nextChapter)
    setCrystals((prev) => prev + chapterCrystalBonus)
    setTotalEarned((prev) => prev + chapterCrystalBonus)
    setEnergy((prev) => prev + chapterEnergyBonus)
    setNarrativeModal({
      title: `Ты открыл новую эру! ${chapterData.title}`,
      description: `${chapterData.story}\n\nГолосовой текст: "${chapterData.voiceLine}"\n\nНаграда: +${chapterCrystalBonus} кристаллов и +${chapterEnergyBonus} энергии.`,
      visible: true,
    })
    pushHistory(`Открыта новая глава: ${chapterData.title}`)
    showToast(`Новая глава: ${chapterData.title}`, 'success')
  }, [currentChapter, level])

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current)
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
      if (eventNoticeTimerRef.current)
        window.clearTimeout(eventNoticeTimerRef.current)
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
      if (shakeTimerRef.current) window.clearTimeout(shakeTimerRef.current)
    }
  }, [])

  const spawnParticles = (x: number, y: number) => {
    const count = reducedEffects ? 4 : 8
    const spread = reducedEffects ? 38 : 54
    const createdParticles: AsteroidParticle[] = Array.from(
      { length: count },
      (_, index) => {
        const angle = (index / count) * Math.PI * 2 + Math.random() * 0.2
        const distance = spread * (0.65 + Math.random() * 0.45)
        return {
          id: particleIdRef.current++,
          x,
          y,
          size: reducedEffects
            ? 6 + Math.floor(Math.random() * 4)
            : 8 + Math.floor(Math.random() * 6),
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
        }
      },
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
  }

  const handleBaseTap = () => {
    setCrystals((prev) => prev + 1)
    setTotalEarned((prev) => prev + 1)
    setIsTapBurst(true)
    setTapBurstTick((prev) => prev + 1)
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current)
    burstTimerRef.current = window.setTimeout(
      () => setIsTapBurst(false),
      reducedEffects ? 140 : 180,
    )
  }

  const handlePlanetTap = (x: number, y: number) => {
    const gain =
      (tapPower + artifactTapBonus) *
      activePlanet.tapBonus.crystals *
      eventTapMultiplier
    const roundedGain = Math.max(1, Math.floor(gain))
    setCrystals((prev) => prev + roundedGain)
    setTotalEarned((prev) => prev + roundedGain)
    setTapCount((prev) => prev + 1)
    setIsTapBurst(true)
    setTapBurstTick((prev) => prev + 1)
    spawnParticles(x, y)

    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current)
    burstTimerRef.current = window.setTimeout(
      () => setIsTapBurst(false),
      reducedEffects ? 140 : 180,
    )

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
      anomalyStardustBonus +
      artifactStardustBonus
    if (level >= 8 && Math.random() < finalStardustChance / 100) {
      setStardust((prev) => prev + 1)
      showToast('+1 звёздная пыль!', 'success')
    }
  }

  const updateStarterCameraTarget = (clientX: number, clientY: number) => {
    const stageRect = starterStageRef.current?.getBoundingClientRect()
    if (!stageRect) return
    const nx = (clientX - stageRect.left) / stageRect.width - 0.5
    const ny = (clientY - stageRect.top) / stageRect.height - 0.5
    starterCameraTargetRef.current = {
      x: Math.max(-1, Math.min(1, nx * 2)),
      y: Math.max(-1, Math.min(1, ny * 2)),
    }
    starterLastInputAtRef.current = Date.now()
  }

  const handleStarterTap = (clientX: number, clientY: number) => {
    const rect = starterHitRef.current?.getBoundingClientRect()
    if (!rect) return
    handleBaseTap()
    spawnParticles(clientX - rect.left, clientY - rect.top)
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
    pushHistory('Куплено улучшение: Ускорить пассив')
    showToast('Улучшение куплено: Ускорить пассив', 'success')
  }

  const buyTapUpgrade = () => {
    if (!spendForUpgrade(costTap)) return
    setTapPower((prev) => prev + BALANCE.shop.tap.tapAdd)
    setUpgradesBought((prev) => prev + 1)
    pushHistory('Куплено улучшение: Увеличить тап')
    showToast('Улучшение куплено: Увеличить тап', 'success')
  }

  const buyEnergyUpgrade = () => {
    if (level < 3) return
    if (!spendForUpgrade(costEnergy)) return
    setEnergyMultiplier((prev) => prev + BALANCE.shop.energy.multiplierAdd)
    setUpgradesBought((prev) => prev + 1)
    pushHistory('Куплено улучшение: Энергия бустер')
    showToast('Улучшение куплено: Энергия бустер', 'success')
  }

  const buyRareDropUpgrade = () => {
    if (level < 6) return
    if (!spendForUpgrade(costRare)) return
    setStardustChance((prev) => prev + BALANCE.shop.rare.chanceAdd)
    setUpgradesBought((prev) => prev + 1)
    pushHistory('Куплено улучшение: Редкий дроп')
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
    const reward = Math.floor(BALANCE.daily.rewardPerLevel * level * artifactDailyBonus)
    const now = Date.now()
    setCrystals((prev) => prev + reward)
    setTotalEarned((prev) => prev + reward)
    setCanClaimDaily(false)
    setLastClaimAt(now)
    window.localStorage.setItem('lastClaim', String(now))
    pushHistory(`Получен ежедневный бонус: +${reward} кристаллов`)
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

  const shareEmpire = async () => {
    const text =
      `Я строю империю в Galaxor! Уровень ${level}, кристаллы ${Math.floor(crystals)}. ` +
      `Присоединяйся: ${referralLink}`
    try {
      await navigator.clipboard.writeText(text)
      showToast('Текст империи скопирован', 'success')
    } catch {
      showToast('Не удалось скопировать текст', 'info')
    }
  }

  const askAdvisor = async () => {
    const text = aiQuestion.trim()
    if (!text) return

    setAiLoading(true)
    setAiError('')
    try {
      const answer = await askAiAdvisor({
        message: text,
        mode: activeEvent ? 'event' : 'advisor',
        gameState: {
          level,
          crystals: Math.floor(crystals),
          energy: Math.floor(energy),
          stardust: Math.floor(stardust),
          passiveIncome: Math.floor(passiveIncome),
          chapterTitle: activeChapter.title,
          activePlanetName: activePlanet.name,
          fleetLevels: ships.map((ship) => ({ name: ship.name, level: ship.level })),
          unlockedPlanets: unlockedPlanets.length,
          artifactsOwned: artifactCollection.length,
          expeditionsRunning: expeditions.filter((item) => item.status === 'running')
            .length,
          activeEvent: activeEvent?.title ?? null,
        },
      })
      setAiAnswer(answer)
      pushHistory('ИИ-советник дал новый стратегический ответ')
    } catch (error) {
      setAiError(
        error instanceof Error ? error.message : 'Не удалось связаться с ИИ',
      )
    } finally {
      setAiLoading(false)
    }
  }

  const activateMiniGame = () => {
    if (miniGameActive || miniGameCooldownSec > 0) return
    const now = Date.now()
    setMiniGameActiveUntil(now + 60_000)
    setMiniGameCooldownUntil(now + 180_000)
    pushHistory(`Активирована мини-игра на планете ${activePlanet.name}`)
    showToast('Мини-игра активирована на 60с', 'success')
  }

  const changeMiniGameDifficulty = (difficulty: MiniGameDifficulty) => {
    setMiniGameDifficultyByPlanet((prev) => ({
      ...prev,
      [currentPlanetId]: difficulty,
    }))
    pushHistory(`Режим мини-игры: ${difficulty === 'easy' ? 'Лёгкий' : difficulty === 'hard' ? 'Хард' : 'Нормальный'}`)
  }

  const handleMiniGameReward = (
    reward: { crystals: number; energy: number; stardust: number; artifactRoll: boolean },
    message: string,
    difficulty: MiniGameDifficulty,
  ) => {
    const hardPenalty = difficulty === 'hard' && Math.random() < 0.1
    setCrystals((prev) => prev + reward.crystals)
    setEnergy((prev) => {
      const next = prev + reward.energy - (hardPenalty ? 1 : 0)
      return Math.max(0, next)
    })
    setStardust((prev) => prev + reward.stardust)
    setTotalEarned((prev) => prev + reward.crystals)
    if (reward.artifactRoll) tryUnlockArtifact('мини-игра', 1)
    pushHistory(
      `${message}: +${reward.crystals} крист., +${reward.energy} энергии${
        hardPenalty ? ', -1 энергия (риск Hard)' : ''
      }`,
    )
    showToast('Награда мини-игры получена', 'success')
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
        BALANCE.expedition.rewardBaseFactor *
        artifactExpeditionBonus,
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
    pushHistory(`Экспедиция отправлена: ${ship.name} на ${selectedDuration}ч`)
    showToast(`Экспедиция отправлена: ${ship.name}`, 'success')
  }

  const claimExpedition = (expeditionId: string) => {
    const target = expeditions.find((item) => item.id === expeditionId)
    if (!target || target.status !== 'ready') return

    setCrystals((prev) => prev + target.reward.crystals)
    setEnergy((prev) => prev + target.reward.energy)
    setStardust((prev) => prev + target.reward.stardust)
    setTotalEarned((prev) => prev + target.reward.crystals)
    if (target.reward.artifact) {
      setFreeUpgradeTokens((prev) => prev + 1)
      tryUnlockArtifact('экспедиция', 0.6)
    }

    setExpeditions((prev) =>
      prev.map((item) =>
        item.id === expeditionId ? { ...item, status: 'claimed' } : item,
      ),
    )
    pushHistory(`Завершена экспедиция: ${target.shipName}`)
    showToast('Награда экспедиции получена', 'success')
  }

  return (
    <main
      className={`space-bg chapter-${currentChapter} min-h-[100svh] w-full px-4 py-6 text-white sm:px-6 ${
        reducedEffects ? 'reduced-fx' : ''
      } ${uiDensity === 'compact' ? 'ui-compact' : ''}`}
    >
      <section
        className={`relative mx-auto flex min-h-[calc(100svh-3rem)] w-full max-w-5xl flex-col rounded-3xl border border-white/10 bg-slate-950/40 p-5 backdrop-blur-xl shadow-[0_0_90px_rgba(20,130,255,0.2)] sm:p-8 ${
          screenShake ? 'screen-shake' : ''
        }`}
      >
        <div className="hero-intro mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          {username && <p className="hero-pilot text-sm text-slate-300">{`Пилот: @${username}`}</p>}

          <h1 className="hero-title mt-2 text-5xl font-black tracking-wide text-white sm:text-6xl galaxor-glow">
            Galaxor
          </h1>
          <p className="hero-subtitle mt-3 text-sm text-slate-200/95">
            Стратегия космической добычи ресурсов
          </p>

          <div className="mt-6 flex w-full justify-center">
            <TonConnectButton className="!w-full max-w-xs" />
          </div>
        </div>

        {!walletConnected ? (
          <div className="mx-auto mt-6 w-full max-w-xl rounded-2xl border border-cyan-300/20 bg-slate-900/60 p-4 text-center">
            <p className="text-sm text-slate-200">
              Подключи кошелёк TON для сохранения прогресса и открытия продвинутых механик
            </p>
            <p className="mt-3 text-lg font-semibold text-cyan-100">
              Базовый режим: 💎 {crystals}
            </p>
            <div
              ref={starterStageRef}
              className="planet-stage mt-4"
              onMouseMove={(event) =>
                updateStarterCameraTarget(event.clientX, event.clientY)
              }
              onMouseLeave={() => {
                starterLastInputAtRef.current = 0
              }}
              onTouchMove={(event) => {
                const firstTouch = event.touches[0]
                if (!firstTouch) return
                updateStarterCameraTarget(firstTouch.clientX, firstTouch.clientY)
              }}
              onTouchEnd={() => {
                starterLastInputAtRef.current = 0
              }}
            >
              <div className="planet-canvas-wrap">
                <Suspense
                  fallback={
                    <div className="planet-scene-fallback planet-gas" />
                  }
                >
                  {useBabylonPlanet ? (
                    <LazyPlanetSceneBabylon
                      planetId={starterPlanetId}
                      ships={starterSceneShips}
                      auraActive={false}
                      isTapBurst={isTapBurst}
                      tapBurstTick={tapBurstTick}
                      pointerRef={starterCameraTargetRef}
                      lastInputAtRef={starterLastInputAtRef}
                      reducedMotion={reducedEffects}
                    />
                  ) : (
                    <LazyPlanetScene3D
                      planetId={starterPlanetId}
                      ships={starterSceneShips}
                      auraActive={false}
                      isTapBurst={isTapBurst}
                      tapBurstTick={tapBurstTick}
                      pointerRef={starterCameraTargetRef}
                      lastInputAtRef={starterLastInputAtRef}
                      reducedMotion={reducedEffects}
                    />
                  )}
                </Suspense>
              </div>
              <div
                ref={starterHitRef}
                className="planet-hit-surface"
                onClick={(event) =>
                  handleStarterTap(event.clientX, event.clientY)
                }
                onTouchStart={(event) => {
                  event.preventDefault()
                  const firstTouch = event.touches[0]
                  if (!firstTouch) return
                  handleStarterTap(firstTouch.clientX, firstTouch.clientY)
                }}
              >
                {particles.map((particle) => (
                  <div
                    key={particle.id}
                    className="particle"
                    style={
                      {
                        left: `${particle.x}px`,
                        top: `${particle.y}px`,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        '--dx': `${particle.dx}px`,
                        '--dy': `${particle.dy}px`,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
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
              chapterTitle={activeChapter.title}
            />

            <section className="rounded-2xl border border-cyan-300/15 bg-slate-900/35 p-4">
              <p className="text-xs uppercase tracking-wide text-cyan-200/80">
                Следующий лучший шаг
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-200">{nextBestAction.text}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab(nextBestAction.tab)}
                  className="rounded-lg border border-cyan-300/30 bg-cyan-400/20 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/30"
                >
                  Перейти
                </button>
              </div>
            </section>

            <PlanetMap
              planets={planets}
              activePlanetId={currentPlanetId}
              ships={ships}
              isTapBurst={isTapBurst}
              tapBurstTick={tapBurstTick}
              particles={particles}
              auraActive={setBonuses.fullSet}
              onSelectPlanet={setCurrentPlanetId}
              onTapPlanet={handlePlanetTap}
            />

            <MiniGame
              planet={activePlanet}
              level={level}
              active={miniGameActive}
              remainingSec={miniGameRemainingSec}
              cooldownSec={miniGameCooldownSec}
              difficulty={miniGameDifficulty}
              onDifficultyChange={changeMiniGameDifficulty}
              onActivate={activateMiniGame}
              onReward={handleMiniGameReward}
            />

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-2 md:grid-cols-9">
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
              <button
                type="button"
                onClick={() => setActiveTab('artifacts')}
                className={`tab-btn ${activeTab === 'artifacts' ? 'tab-btn-active' : ''}`}
              >
                Артефакты
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`tab-btn ${activeTab === 'history' ? 'tab-btn-active' : ''}`}
              >
                История
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('command')}
                className={`tab-btn ${activeTab === 'command' ? 'tab-btn-active' : ''}`}
              >
                Командный центр
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`tab-btn ${activeTab === 'ai' ? 'tab-btn-active' : ''}`}
              >
                ИИ
              </button>
            </div>

            <Suspense
              fallback={
                <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4 text-sm text-slate-300">
                  Загрузка раздела...
                </section>
              }
            >
              {activeTab === 'shop' && (
                <LazyShop
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
                <LazyFleet
                  crystals={crystals}
                  ships={ships}
                  onUpgradeShip={upgradeShip}
                  getShipCost={getShipCost}
                />
              )}

              {activeTab === 'expeditions' && (
                <LazyExpedition
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
                <LazyMissions
                  level={level}
                  canClaimDaily={canClaimDaily}
                  dailyReward={Math.floor(BALANCE.daily.rewardPerLevel * level * artifactDailyBonus)}
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
                <LazyReferral
                  referralLink={referralLink}
                  userId={userId}
                  invitedCount={0}
                  allianceFriends={friendsCount}
                  leaderboard={leaderboardMock}
                  onCopy={copyReferralLink}
                  onShareEmpire={shareEmpire}
                />
              )}

              {activeTab === 'artifacts' && (
                <LazyArtifactGallery
                  artifacts={ARTIFACTS_POOL}
                  ownedIds={artifactCollection}
                  setBonusActive={setBonuses.fullSet}
                  epochSetActive={setBonuses.epochSet}
                />
              )}

              {activeTab === 'history' && (
                <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
                  <h2 className="text-base font-semibold text-white">История</h2>
                  <p className="mt-1 text-xs text-slate-300">
                    Хроника событий, глав и экспедиций
                  </p>
                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {historyLog.length === 0 ? (
                      <p className="text-sm text-slate-300">
                        Пока история пуста. Начни исследование галактики.
                      </p>
                    ) : (
                      historyLog.map((item, index) => (
                        <p
                          key={`${item}-${index}`}
                          className="rounded-lg border border-white/10 bg-slate-900/55 px-3 py-2 text-xs text-slate-200"
                        >
                          {item}
                        </p>
                      ))
                    )}
                  </div>
                </section>
              )}

              {activeTab === 'command' && (
                <LazyCommandCenter
                  factionRep={factionRep}
                  storyTitle={activeStoryOp.title}
                  storyDescription={activeStoryOp.description}
                  storyChoices={activeStoryOp.choices.map((choice) => ({
                    id: choice.id,
                    title: choice.title,
                    outcome: choice.outcome,
                  }))}
                  onChooseStory={applyStoryChoice}
                  storyHistory={storyHistory}
                  passTier={passTier}
                  passMilestones={[...PASS_MILESTONES]}
                  passPremium={passPremium}
                  passClaimedFree={passClaimedFree}
                  passClaimedPremium={passClaimedPremium}
                  passPoints={passPoints}
                  onUnlockPremium={unlockPremiumPass}
                  onClaimFree={(tier: number) => claimPassReward(tier, false)}
                  onClaimPremium={(tier: number) => claimPassReward(tier, true)}
                  stardust={stardust}
                  cosmetics={COSMETIC_CATALOG.map((item) => ({
                    ...item,
                    owned: cosmeticsOwned.includes(item.id),
                  }))}
                  onBuyCosmetic={buyCosmetic}
                  uiDensity={uiDensity}
                  onToggleUiDensity={() =>
                    setUiDensity((prev) =>
                      prev === 'compact' ? 'comfortable' : 'compact',
                    )
                  }
                />
              )}

              {activeTab === 'ai' && (
                <LazyAIPanel
                  question={aiQuestion}
                  answer={aiAnswer}
                  loading={aiLoading}
                  error={aiError}
                  onQuestionChange={setAiQuestion}
                  onAsk={askAdvisor}
                  onUsePreset={setAiQuestion}
                />
              )}
            </Suspense>
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
        <NarrativeModal
          visible={Boolean(narrativeModal?.visible)}
          title={narrativeModal?.title ?? ''}
          description={narrativeModal?.description ?? ''}
          onClose={() => setNarrativeModal(null)}
        />
        {screenFlash && <div className="screen-flash" />}
      </section>
    </main>
  )
}

export default App
