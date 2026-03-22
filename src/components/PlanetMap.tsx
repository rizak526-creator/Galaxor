import type { CSSProperties, TouchEvent } from 'react'
import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { AsteroidParticle } from './Asteroid'

const LazyPlanetScene3D = lazy(() =>
  import('./PlanetScene3D').then((module) => ({ default: module.PlanetScene3D })),
)
const LazyPlanetSceneBabylon = lazy(() =>
  import('./PlanetSceneBabylon').then((module) => ({ default: module.PlanetSceneBabylon })),
)

export type Planet = {
  id: string
  name: string
  subtitle: string
  unlocked: boolean
  unlockLevel: number
  passiveMultiplier: number
  tapBonus: {
    crystals: number
    energyChance: number
    stardustChance: number
  }
  objectClass: string
  icon: string
}

export type FleetShip = {
  id: string
  name: string
  icon: string
  level: number
}

type PlanetMapProps = {
  planets: Planet[]
  activePlanetId: string
  ships: FleetShip[]
  isTapBurst: boolean
  tapBurstTick: number
  particles: AsteroidParticle[]
  auraActive?: boolean
  onSelectPlanet: (planetId: string) => void
  onTapPlanet: (x: number, y: number) => void
}

export function PlanetMap({
  planets,
  activePlanetId,
  ships,
  isTapBurst,
  tapBurstTick,
  particles,
  auraActive = false,
  onSelectPlanet,
  onTapPlanet,
}: PlanetMapProps) {
  const engineMode = (import.meta.env.VITE_PLANET_ENGINE ?? 'babylon').toLowerCase()
  const useBabylon = engineMode !== 'three'
  const planetRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const [planetTransition, setPlanetTransition] = useState(false)
  const [planetCaptionVisible, setPlanetCaptionVisible] = useState(false)
  const cameraTargetRef = useRef({ x: 0, y: 0 })
  const lastInputAtRef = useRef(0)
  const lastPlanetTouchTapAtRef = useRef(0)
  const chipTouchRef = useRef({
    startX: 0,
    startY: 0,
    dragging: false,
    lastDragAt: 0,
  })
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const activePlanet =
    planets.find((planet) => planet.id === activePlanetId) ?? planets[0]

  useEffect(() => {
    setPlanetTransition(true)
    const timer = window.setTimeout(() => setPlanetTransition(false), 320)
    return () => window.clearTimeout(timer)
  }, [activePlanetId])

  useEffect(() => {
    setPlanetCaptionVisible(true)
    const timer = window.setTimeout(() => setPlanetCaptionVisible(false), 700)
    return () => window.clearTimeout(timer)
  }, [activePlanetId])

  const onTap = (clientX: number, clientY: number) => {
    const rect = planetRef.current?.getBoundingClientRect()
    if (!rect || !activePlanet?.unlocked) return
    onTapPlanet(clientX - rect.left, clientY - rect.top)
  }

  const updateCameraTarget = (clientX: number, clientY: number) => {
    const stageRect = stageRef.current?.getBoundingClientRect()
    if (!stageRect) return
    const nx = (clientX - stageRect.left) / stageRect.width - 0.5
    const ny = (clientY - stageRect.top) / stageRect.height - 0.5
    cameraTargetRef.current = {
      x: Math.max(-1, Math.min(1, nx * 2)),
      y: Math.max(-1, Math.min(1, ny * 2)),
    }
    lastInputAtRef.current = Date.now()
  }

  const handleChipTouchStart = (event: TouchEvent<HTMLButtonElement>) => {
    const firstTouch = event.touches[0]
    if (!firstTouch) return
    chipTouchRef.current.startX = firstTouch.clientX
    chipTouchRef.current.startY = firstTouch.clientY
    chipTouchRef.current.dragging = false
  }

  const handleChipTouchMove = (event: TouchEvent<HTMLButtonElement>) => {
    const firstTouch = event.touches[0]
    if (!firstTouch) return
    const dx = Math.abs(firstTouch.clientX - chipTouchRef.current.startX)
    const dy = Math.abs(firstTouch.clientY - chipTouchRef.current.startY)
    if (dx > 12 && dx > dy) {
      chipTouchRef.current.dragging = true
    }
  }

  const handleChipTouchEnd = () => {
    if (chipTouchRef.current.dragging) {
      chipTouchRef.current.lastDragAt = Date.now()
    }
    chipTouchRef.current.dragging = false
  }

  const handleChipClick = (planet: Planet) => {
    if (!planet.unlocked) return
    const wasSwipe =
      chipTouchRef.current.dragging || Date.now() - chipTouchRef.current.lastDragAt < 260
    if (wasSwipe) return
    onSelectPlanet(planet.id)
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
      <div className="planet-scroll">
        {planets.map((planet) => {
          const isActive = planet.id === activePlanetId
          return (
            <button
              key={planet.id}
              type="button"
              onClick={() => handleChipClick(planet)}
              onTouchStart={handleChipTouchStart}
              onTouchMove={handleChipTouchMove}
              onTouchEnd={handleChipTouchEnd}
              onTouchCancel={handleChipTouchEnd}
              className={`planet-chip ${isActive ? 'planet-chip-active' : ''}`}
              disabled={!planet.unlocked}
            >
              <span className="planet-chip-icon">
                <img src={planet.icon} alt={planet.name} />
              </span>
              <span>{planet.name}</span>
              {!planet.unlocked && <span className="text-[10px]">Lv.{planet.unlockLevel}</span>}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-col items-center">
        <p className="text-sm text-cyan-100">
          Текущая планета: {activePlanet.name} — +{activePlanet.passiveMultiplier}x пассив
        </p>
        <p className="mt-1 text-xs text-slate-300">{activePlanet.subtitle}</p>

        <div
          ref={stageRef}
          className="planet-stage mt-4"
          onMouseMove={(event) => updateCameraTarget(event.clientX, event.clientY)}
          onMouseLeave={() => {
            lastInputAtRef.current = 0
          }}
          onTouchMove={(event) => {
            const firstTouch = event.touches[0]
            if (!firstTouch) return
            updateCameraTarget(firstTouch.clientX, firstTouch.clientY)
          }}
          onTouchEnd={() => {
            lastInputAtRef.current = 0
          }}
        >
          <div className="planet-canvas-wrap">
            <Suspense fallback={<div className={`planet-scene-fallback ${activePlanet.objectClass}`} />}>
              {useBabylon ? (
                <LazyPlanetSceneBabylon
                  key={activePlanet.id}
                  planetId={activePlanet.id}
                  ships={ships}
                  auraActive={auraActive}
                  isTapBurst={isTapBurst}
                  tapBurstTick={tapBurstTick}
                  pointerRef={cameraTargetRef}
                  lastInputAtRef={lastInputAtRef}
                  reducedMotion={reducedMotion}
                />
              ) : (
                <LazyPlanetScene3D
                  key={activePlanet.id}
                  planetId={activePlanet.id}
                  ships={ships}
                  auraActive={auraActive}
                  isTapBurst={isTapBurst}
                  tapBurstTick={tapBurstTick}
                  pointerRef={cameraTargetRef}
                  lastInputAtRef={lastInputAtRef}
                  reducedMotion={reducedMotion}
                />
              )}
            </Suspense>
            {planetCaptionVisible && (
              <div className="planet-cinematic-caption">
                <p>{activePlanet.name}</p>
                <span>{activePlanet.subtitle}</span>
              </div>
            )}
          </div>

          <div
            ref={planetRef}
            className={`planet-hit-surface ${
              planetTransition ? 'planet-transition' : ''
            } ${auraActive ? 'artifact-aura' : ''}`}
            onClick={(event) => {
              if (Date.now() - lastPlanetTouchTapAtRef.current < 500) return
              onTap(event.clientX, event.clientY)
            }}
            onTouchStart={(event) => {
              event.preventDefault()
              const firstTouch = event.touches[0]
              if (!firstTouch) return
              lastPlanetTouchTapAtRef.current = Date.now()
              onTap(firstTouch.clientX, firstTouch.clientY)
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
    </section>
  )
}
