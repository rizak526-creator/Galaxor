import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { FleetShip } from './PlanetMap'

type PlanetScene3DProps = {
  planetId: string
  ships: FleetShip[]
  auraActive?: boolean
  pointerRef: MutableRefObject<{ x: number; y: number }>
  lastInputAtRef: MutableRefObject<number>
  reducedMotion: boolean
}

type Theme = {
  base: string
  emissive: string
  cloud: string
  ring: string
}

const THEMES: Record<string, Theme> = {
  'earth-like': {
    base: '#3b82f6',
    emissive: '#22d3ee',
    cloud: '#dbeafe',
    ring: '#38bdf8',
  },
  'gas-giant': {
    base: '#f97316',
    emissive: '#fdba74',
    cloud: '#fed7aa',
    ring: '#fb923c',
  },
  nebula: {
    base: '#7c3aed',
    emissive: '#c084fc',
    cloud: '#f0abfc',
    ring: '#a78bfa',
  },
  'black-hole': {
    base: '#0f172a',
    emissive: '#f59e0b',
    cloud: '#fb923c',
    ring: '#f59e0b',
  },
  'ice-world': {
    base: '#60a5fa',
    emissive: '#bfdbfe',
    cloud: '#eff6ff',
    ring: '#93c5fd',
  },
  'ancient-ruins': {
    base: '#d97706',
    emissive: '#facc15',
    cloud: '#fde68a',
    ring: '#fbbf24',
  },
}

function SceneContent({
  planetId,
  ships,
  auraActive = false,
  pointerRef,
  lastInputAtRef,
  reducedMotion,
}: PlanetScene3DProps) {
  const planetRef = useRef<THREE.Mesh | null>(null)
  const cloudsRef = useRef<THREE.Mesh | null>(null)
  const auraRef = useRef<THREE.Mesh | null>(null)
  const satelliteRefs = useRef<Array<THREE.Group | null>>([])
  const cameraSmoothingRef = useRef({ x: 0, y: 0 })
  const theme = THEMES[planetId] ?? THEMES['earth-like']

  const orbitParams = useMemo(
    () =>
      ships.map((ship, index) => ({
        id: ship.id,
        radius: 2.45 + index * 0.42,
        speed: 0.55 + index * 0.1,
        tiltX: 0.65 + index * 0.2,
        spinY: index * 0.58,
        phase: index * 1.8,
      })),
    [ships],
  )

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const now = Date.now()
    const idleMode = now - lastInputAtRef.current > 1400
    const target = idleMode
      ? {
          x: Math.sin(now * 0.00026) * 0.25,
          y: Math.cos(now * 0.00021) * 0.16,
        }
      : {
          x: pointerRef.current.x * 0.3,
          y: pointerRef.current.y * 0.22,
        }

    cameraSmoothingRef.current.x +=
      (target.x - cameraSmoothingRef.current.x) * 0.05
    cameraSmoothingRef.current.y +=
      (target.y - cameraSmoothingRef.current.y) * 0.05

    state.camera.position.x = cameraSmoothingRef.current.x
    state.camera.position.y = cameraSmoothingRef.current.y
    state.camera.position.z = 6.4
    state.camera.lookAt(0, 0, 0)

    const planetSpin = reducedMotion ? 0.015 : 0.14
    const cloudSpin = reducedMotion ? 0.025 : 0.24
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * planetSpin
      planetRef.current.rotation.z = Math.sin(t * 0.2) * 0.02
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * cloudSpin
    }
    if (auraRef.current) {
      auraRef.current.rotation.y += delta * 0.08
    }

    for (let i = 0; i < orbitParams.length; i += 1) {
      const sat = satelliteRefs.current[i]
      const orbit = orbitParams[i]
      if (!sat || !orbit) continue

      const timeScale = reducedMotion ? 0.3 : 1
      const angle = t * orbit.speed * timeScale + orbit.phase
      const x = Math.cos(angle) * orbit.radius
      const z = Math.sin(angle) * orbit.radius
      const y = Math.sin(angle * 1.4 + orbit.phase) * 0.35

      sat.position.set(x, y, z)
      sat.rotation.y = angle + Math.PI / 2
      sat.rotation.z = Math.sin(angle * 1.7) * 0.22
    }
  })

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[4.5, 3.5, 5]} intensity={1.3} color="#ffffff" />
      <pointLight position={[-3.8, -2.4, 2.8]} intensity={0.5} color={theme.ring} />

      <mesh ref={planetRef}>
        <sphereGeometry args={[1.95, 64, 64]} />
        <meshStandardMaterial
          color={theme.base}
          emissive={theme.emissive}
          emissiveIntensity={0.16}
          roughness={0.84}
          metalness={0.08}
        />
      </mesh>

      <mesh ref={cloudsRef} scale={1.045}>
        <sphereGeometry args={[1.95, 48, 48]} />
        <meshStandardMaterial
          color={theme.cloud}
          transparent
          opacity={0.15}
          depthWrite={false}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>

      <mesh scale={1.1}>
        <sphereGeometry args={[1.95, 36, 36]} />
        <meshBasicMaterial color={theme.ring} transparent opacity={0.14} side={THREE.BackSide} />
      </mesh>

      {auraActive && (
        <mesh ref={auraRef} scale={1.22}>
          <sphereGeometry args={[1.95, 30, 30]} />
          <meshBasicMaterial
            color="#fde047"
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {orbitParams.map((orbit) => (
        <group key={`orbit-${orbit.id}`} rotation={[orbit.tiltX, orbit.spinY, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[orbit.radius, 0.012, 12, 160]} />
            <meshBasicMaterial color={theme.ring} transparent opacity={0.34} />
          </mesh>
        </group>
      ))}

      {orbitParams.map((orbit, index) => (
        <group key={`sat-${orbit.id}`} rotation={[orbit.tiltX, orbit.spinY, 0]}>
          <group ref={(node: THREE.Group | null) => (satelliteRefs.current[index] = node)}>
            <mesh>
              <sphereGeometry args={[0.12, 20, 20]} />
              <meshStandardMaterial
                color="#dbeafe"
                emissive={theme.ring}
                emissiveIntensity={0.28}
                roughness={0.42}
                metalness={0.45}
              />
            </mesh>
            <mesh position={[0.16, 0, 0]} rotation={[0, 0, 0.2]}>
              <boxGeometry args={[0.2, 0.045, 0.1]} />
              <meshStandardMaterial color="#64748b" roughness={0.55} metalness={0.5} />
            </mesh>
            <mesh position={[-0.16, 0, 0]} rotation={[0, 0, -0.2]}>
              <boxGeometry args={[0.2, 0.045, 0.1]} />
              <meshStandardMaterial color="#64748b" roughness={0.55} metalness={0.5} />
            </mesh>
            <mesh position={[0.02, 0.03, 0.08]}>
              <sphereGeometry args={[0.03, 12, 12]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.65} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  )
}

export function PlanetScene3D(props: PlanetScene3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6.4], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      className="planet-canvas"
    >
      <SceneContent {...props} />
    </Canvas>
  )
}
