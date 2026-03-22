import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { AsteroidParticle } from './Asteroid'

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
  particles,
  auraActive = false,
  onSelectPlanet,
  onTapPlanet,
}: PlanetMapProps) {
  const planetRef = useRef<HTMLDivElement | null>(null)
  const [planetTransition, setPlanetTransition] = useState(false)
  const activePlanet =
    planets.find((planet) => planet.id === activePlanetId) ?? planets[0]

  useEffect(() => {
    setPlanetTransition(true)
    const timer = window.setTimeout(() => setPlanetTransition(false), 320)
    return () => window.clearTimeout(timer)
  }, [activePlanetId])

  const onTap = (clientX: number, clientY: number) => {
    const rect = planetRef.current?.getBoundingClientRect()
    if (!rect || !activePlanet?.unlocked) return
    onTapPlanet(clientX - rect.left, clientY - rect.top)
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
              onClick={() => planet.unlocked && onSelectPlanet(planet.id)}
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

        <div className="planet-stage mt-4">
          <div
            ref={planetRef}
            className={`planet-core ${activePlanet.objectClass} ${isTapBurst ? 'tap-burst' : ''} ${
              planetTransition ? 'planet-transition' : ''
            } ${auraActive ? 'artifact-aura' : ''}`}
            onClick={(event) => onTap(event.clientX, event.clientY)}
            onTouchStart={(event) => {
              event.preventDefault()
              const firstTouch = event.touches[0]
              if (!firstTouch) return
              onTap(firstTouch.clientX, firstTouch.clientY)
            }}
          >
            <span className={`planet-rotation-layer spin-${activePlanet.id}`} />
            <span className={`planet-cloud-layer cloud-${activePlanet.id}`} />
            <span className="planet-night-shadow" />
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
            <span className="planet-emblem">
              <img src={activePlanet.icon} alt={activePlanet.name} />
            </span>
          </div>

          {/* Визуал флота вокруг активной планеты */}
          <div className="ship-ring">
            {ships.map((ship, index) => {
              const orbitSize = 332 + index * 34
              const orbitDuration = 10 + index * 2.2
              const orbitDirection = index % 2 === 0 ? 'normal' : 'reverse'
              const shipScale = 1 + Math.min(ship.level, 40) * 0.01
              const glowAlpha = Math.min(0.78, 0.3 + ship.level * 0.02)

              return (
                <div
                  key={ship.id}
                  className="ship-orbit-shell"
                  style={
                    {
                      '--orbit-size': `${orbitSize}px`,
                      '--orbit-duration': `${orbitDuration}s`,
                      '--orbit-direction': orbitDirection,
                      '--ship-scale': shipScale.toFixed(2),
                      '--ship-glow': `rgba(56, 189, 248, ${glowAlpha.toFixed(2)})`,
                    } as CSSProperties
                  }
                  title={`${ship.name} Lv.${ship.level}`}
                >
                  <span className="ship-orbit-line" />
                  <div className="ship-orbit-rotator" style={{ animationDelay: `${index * 0.7}s` }}>
                    <span className="ship-badge">
                      <img src={ship.icon} alt={ship.name} className="ship-icon" />
                      <small>Lv.{ship.level}</small>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
