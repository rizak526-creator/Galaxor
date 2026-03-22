import type { CSSProperties } from 'react'
import { useRef } from 'react'

export type AsteroidParticle = {
  id: number
  x: number
  y: number
  size: number
  dx: number
  dy: number
}

type AsteroidProps = {
  isTapBurst: boolean
  particles: AsteroidParticle[]
  onTap: (clientX: number, clientY: number) => void
}

export function Asteroid({ isTapBurst, particles, onTap }: AsteroidProps) {
  const asteroidRef = useRef<HTMLDivElement | null>(null)

  const sendTap = (clientX: number, clientY: number) => {
    const rect = asteroidRef.current?.getBoundingClientRect()
    if (!rect) return
    onTap(clientX - rect.left, clientY - rect.top)
  }

  return (
    <div className="flex justify-center">
      <div
        ref={asteroidRef}
        className={`asteroid ${isTapBurst ? 'tap-burst' : ''}`}
        onClick={(event) => sendTap(event.clientX, event.clientY)}
        onTouchStart={(event) => {
          event.preventDefault()
          const firstTouch = event.touches[0]
          if (!firstTouch) return
          sendTap(firstTouch.clientX, firstTouch.clientY)
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
  )
}
