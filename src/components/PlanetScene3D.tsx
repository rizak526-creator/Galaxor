import { Environment, Sparkles, Stars } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import type { FleetShip } from './PlanetMap'

type PlanetScene3DProps = {
  planetId: string
  ships: FleetShip[]
  auraActive?: boolean
  isTapBurst?: boolean
  pointerRef: MutableRefObject<{ x: number; y: number }>
  lastInputAtRef: MutableRefObject<number>
  reducedMotion: boolean
}

type Theme = {
  base: string
  secondary: string
  emissive: string
  cloud: string
  ring: string
  orbit: string
}

type PlanetVisual = {
  radius: number
  roughness: number
  metalness: number
  clearcoat: number
  cloudOpacity: number
  emissiveIntensity: number
}

const THEMES: Record<string, Theme> = {
  'earth-like': {
    base: '#3b82f6',
    secondary: '#0f4ec7',
    emissive: '#22d3ee',
    cloud: '#dbeafe',
    ring: '#38bdf8',
    orbit: '#7dd3fc',
  },
  'gas-giant': {
    base: '#f97316',
    secondary: '#b45309',
    emissive: '#fdba74',
    cloud: '#fed7aa',
    ring: '#fb923c',
    orbit: '#fdba74',
  },
  nebula: {
    base: '#7c3aed',
    secondary: '#4c1d95',
    emissive: '#c084fc',
    cloud: '#f0abfc',
    ring: '#a78bfa',
    orbit: '#c4b5fd',
  },
  'black-hole': {
    base: '#0f172a',
    secondary: '#030712',
    emissive: '#f59e0b',
    cloud: '#fb923c',
    ring: '#f59e0b',
    orbit: '#fb923c',
  },
  'ice-world': {
    base: '#60a5fa',
    secondary: '#2563eb',
    emissive: '#bfdbfe',
    cloud: '#eff6ff',
    ring: '#93c5fd',
    orbit: '#dbeafe',
  },
  'ancient-ruins': {
    base: '#d97706',
    secondary: '#92400e',
    emissive: '#facc15',
    cloud: '#fde68a',
    ring: '#fbbf24',
    orbit: '#fde68a',
  },
}

const PLANET_VISUALS: Record<string, PlanetVisual> = {
  'earth-like': { radius: 1.45, roughness: 0.56, metalness: 0.08, clearcoat: 1, cloudOpacity: 0.2, emissiveIntensity: 0.18 },
  'gas-giant': { radius: 1.78, roughness: 0.78, metalness: 0.03, clearcoat: 0.68, cloudOpacity: 0.28, emissiveIntensity: 0.12 },
  nebula: { radius: 1.36, roughness: 0.34, metalness: 0.16, clearcoat: 1, cloudOpacity: 0.34, emissiveIntensity: 0.3 },
  'black-hole': { radius: 1.1, roughness: 0.26, metalness: 0.32, clearcoat: 0.25, cloudOpacity: 0.05, emissiveIntensity: 0.46 },
  'ice-world': { radius: 1.52, roughness: 0.28, metalness: 0.22, clearcoat: 1, cloudOpacity: 0.09, emissiveIntensity: 0.24 },
  'ancient-ruins': { radius: 1.64, roughness: 0.74, metalness: 0.12, clearcoat: 0.52, cloudOpacity: 0.07, emissiveIntensity: 0.16 },
}

function createPlanetTexture(planetId: string, theme: Theme): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
  gradient.addColorStop(0, theme.base)
  gradient.addColorStop(0.5, theme.secondary)
  gradient.addColorStop(1, theme.base)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const paintBlobs = (count: number, colorA: string, colorB: string, alpha = 0.24) => {
    ctx.globalAlpha = alpha
    for (let i = 0; i < count; i += 1) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const r = 24 + Math.random() * 98
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, i % 2 === 0 ? colorA : colorB)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  if (planetId === 'earth-like') {
    paintBlobs(14, '#22c55e', '#16a34a', 0.3)
  } else if (planetId === 'gas-giant') {
    ctx.globalAlpha = 0.3
    for (let i = 0; i < 20; i += 1) {
      const y = (i / 20) * canvas.height
      ctx.fillStyle = i % 2 === 0 ? '#fcd34d' : '#fb923c'
      ctx.fillRect(0, y, canvas.width, 14 + Math.sin(i * 0.7) * 6)
    }
    ctx.globalAlpha = 1
  } else if (planetId === 'nebula') {
    paintBlobs(28, '#f0abfc', '#c084fc', 0.34)
  } else if (planetId === 'black-hole') {
    const hole = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 20, canvas.width / 2, canvas.height / 2, 130)
    hole.addColorStop(0, '#020617')
    hole.addColorStop(0.45, '#030712')
    hole.addColorStop(0.58, '#f59e0b')
    hole.addColorStop(0.74, '#fb923c')
    hole.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.58
    ctx.fillStyle = hole
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalAlpha = 1
  } else if (planetId === 'ice-world') {
    ctx.globalAlpha = 0.28
    ctx.strokeStyle = '#e0f2fe'
    ctx.lineWidth = 3
    for (let i = 0; i < 24; i += 1) {
      const y = Math.random() * canvas.height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y + Math.random() * 20 - 10)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  } else if (planetId === 'ancient-ruins') {
    ctx.globalAlpha = 0.24
    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 2
    for (let i = 0; i < 20; i += 1) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      ctx.strokeRect(x, y, 22 + Math.random() * 40, 10 + Math.random() * 18)
    }
    ctx.globalAlpha = 1
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.anisotropy = 4
  return texture
}

function ShipModel({ shipId, ringColor }: { shipId: string; ringColor: string }) {
  if (shipId === 'mining-drone') {
    return (
      <group>
        <mesh>
          <boxGeometry args={[0.3, 0.13, 0.15]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.18} />
        </mesh>
        <mesh position={[0.26, 0.06, 0]} rotation={[0, 0, 0.26]}>
          <boxGeometry args={[0.22, 0.035, 0.1]} />
          <meshStandardMaterial color="#64748b" metalness={0.94} roughness={0.26} />
        </mesh>
        <mesh position={[-0.26, 0.06, 0]} rotation={[0, 0, -0.26]}>
          <boxGeometry args={[0.22, 0.035, 0.1]} />
          <meshStandardMaterial color="#64748b" metalness={0.94} roughness={0.26} />
        </mesh>
        <mesh position={[0, 0.03, 0.09]}>
          <boxGeometry args={[0.12, 0.04, 0.06]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.86} roughness={0.22} />
        </mesh>
        <mesh position={[0.12, -0.01, 0.12]}>
          <boxGeometry args={[0.06, 0.02, 0.04]} />
          <meshStandardMaterial color="#ef4444" emissive="#f97316" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[-0.12, -0.01, 0.12]}>
          <boxGeometry args={[0.06, 0.02, 0.04]} />
          <meshStandardMaterial color="#ef4444" emissive="#f97316" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, -0.01, -0.1]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.048, 0.16, 10]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.8} />
        </mesh>
      </group>
    )
  }

  if (shipId === 'explorer-scout') {
    return (
      <group>
        <mesh>
          <capsuleGeometry args={[0.062, 0.3, 8, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.96} roughness={0.18} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.16, 0.013, 8, 46]} />
          <meshStandardMaterial color="#7dd3fc" metalness={0.75} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0, 0.13]}>
          <boxGeometry args={[0.07, 0.025, 0.05]} />
          <meshStandardMaterial color="#ef4444" emissive="#f97316" emissiveIntensity={0.32} />
        </mesh>
        <mesh position={[0, 0.12, 0.04]}>
          <sphereGeometry args={[0.032, 12, 12]} />
          <meshBasicMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, -0.02, -0.12]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.042, 0.16, 10]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.78} />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      <mesh>
        <octahedronGeometry args={[0.12, 1]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[0.145, 0.02, 8, 36]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.86} roughness={0.28} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={`probe-arm-${i}`}
          position={[
            Math.cos((i / 3) * Math.PI * 2) * 0.17,
            Math.sin((i / 3) * Math.PI * 2) * 0.17,
            0,
          ]}
          rotation={[0, 0, (i / 3) * Math.PI * 2]}
        >
          <boxGeometry args={[0.09, 0.02, 0.03]} />
          <meshStandardMaterial color="#64748b" metalness={0.82} roughness={0.34} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.12]}>
        <boxGeometry args={[0.08, 0.026, 0.05]} />
        <meshStandardMaterial color="#ef4444" emissive="#f97316" emissiveIntensity={0.33} />
      </mesh>
      <mesh position={[0, -0.06, 0.1]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.046, 0.17, 10]} />
        <meshBasicMaterial color={ringColor} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

function PlanetDecor({ planetId }: { planetId: string }) {
  if (planetId === 'earth-like') {
    return (
      <group>
        <mesh position={[2.2, 0.44, -0.82]}>
          <sphereGeometry args={[0.2, 20, 20]} />
          <meshStandardMaterial color="#86efac" emissive="#22c55e" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[-2.45, -0.6, 0.7]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#f8fafc" emissive="#bfdbfe" emissiveIntensity={0.25} />
        </mesh>
      </group>
    )
  }
  if (planetId === 'gas-giant') {
    return (
      <group>
        <mesh rotation={[Math.PI / 2.5, 0.22, 0]}>
          <torusGeometry args={[2.18, 0.11, 18, 170]} />
          <meshStandardMaterial color="#fdba74" transparent opacity={0.45} roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0.75, 0.15, 1.36]}>
          <sphereGeometry args={[0.16, 20, 20]} />
          <meshStandardMaterial color="#ef4444" emissive="#f97316" emissiveIntensity={0.42} />
        </mesh>
      </group>
    )
  }
  if (planetId === 'black-hole') {
    return (
      <group>
        <mesh>
          <sphereGeometry args={[0.58, 40, 40]} />
          <meshBasicMaterial color="#020617" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0.3, 0]}>
          <torusGeometry args={[1.48, 0.24, 20, 180]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.09, 0.9, 10]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.3} />
        </mesh>
      </group>
    )
  }
  if (planetId === 'ice-world') {
    return (
      <group>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={`ice-spire-${i}`}
            position={[Math.cos(i * 1.2) * 1.34, 0.18 + (i % 2) * 0.2, Math.sin(i * 1.2) * 1.34]}
            rotation={[0.32, i * 1.1, 0]}
          >
            <coneGeometry args={[0.07, 0.3, 6]} />
            <meshStandardMaterial color="#dbeafe" emissive="#93c5fd" emissiveIntensity={0.22} />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2.2, 0.4, 0]}>
          <torusGeometry args={[1.95, 0.028, 10, 120]} />
          <meshStandardMaterial color="#bfdbfe" transparent opacity={0.35} />
        </mesh>
      </group>
    )
  }
  if (planetId === 'ancient-ruins') {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.72, 0.03, 12, 120]} />
          <meshStandardMaterial color="#fde68a" transparent opacity={0.26} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={`ruin-${i}`} position={[Math.cos(i * 1.2) * 1.68, 0.04, Math.sin(i * 1.2) * 1.68]}>
            <boxGeometry args={[0.06, 0.14 + (i % 2) * 0.06, 0.06]} />
            <meshStandardMaterial color="#fcd34d" metalness={0.4} roughness={0.62} />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 6]}>
          <torusGeometry args={[1.95, 0.02, 6, 48]} />
          <meshStandardMaterial color="#f59e0b" transparent opacity={0.24} />
        </mesh>
      </group>
    )
  }
  if (planetId === 'nebula') {
    return (
      <Sparkles count={26} size={3.1} speed={0.12} scale={[4.4, 4.4, 4.4]} color="#f0abfc" opacity={0.28} />
    )
  }
  return null
}

function SceneContent({
  planetId,
  ships,
  auraActive = false,
  isTapBurst = false,
  pointerRef,
  lastInputAtRef,
  reducedMotion,
}: PlanetScene3DProps) {
  const planetGroupRef = useRef<THREE.Group | null>(null)
  const planetRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial> | null>(null)
  const cloudsRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> | null>(null)
  const auraRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | null>(null)
  const satelliteRefs = useRef<Array<THREE.Group | null>>([])
  const cameraSmoothingRef = useRef({ x: 0, y: 0 })
  const tapScaleTargetRef = useRef(1)
  const theme = THEMES[planetId] ?? THEMES['earth-like']
  const visual = PLANET_VISUALS[planetId] ?? PLANET_VISUALS['earth-like']
  const surfaceMap = useMemo(() => createPlanetTexture(planetId, theme), [planetId, theme])
  const planetRadius = visual.radius

  useEffect(() => {
    tapScaleTargetRef.current = isTapBurst ? 1.06 : 1
  }, [isTapBurst])

  const orbitParams = useMemo(
    () =>
      ships.map((ship, index) => ({
        id: ship.id,
        radius: planetRadius + 0.58 + index * 0.34,
        speed: 0.42 + index * 0.14,
        tiltX: 0.45 + index * 0.24,
        spinY: index * 1.1,
        phase: index * 2.2,
        bodyScale: 1.35 + Math.min(ship.level, 30) * 0.015,
      })),
    [planetRadius, ships],
  )

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const now = Date.now()
    const idleMode = now - lastInputAtRef.current > 1400
    const target = idleMode
      ? { x: Math.sin(now * 0.00026) * 0.25, y: Math.cos(now * 0.00021) * 0.16 }
      : { x: pointerRef.current.x * 0.3, y: pointerRef.current.y * 0.22 }

    cameraSmoothingRef.current.x += (target.x - cameraSmoothingRef.current.x) * 0.05
    cameraSmoothingRef.current.y += (target.y - cameraSmoothingRef.current.y) * 0.05

    state.camera.position.x = cameraSmoothingRef.current.x
    state.camera.position.y = cameraSmoothingRef.current.y
    state.camera.position.z = 8.2
    state.camera.lookAt(0, 0, 0)

    if (planetGroupRef.current) {
      const next = THREE.MathUtils.lerp(
        planetGroupRef.current.scale.x,
        tapScaleTargetRef.current,
        0.22,
      )
      planetGroupRef.current.scale.setScalar(next)
    }

    const planetSpin = reducedMotion ? 0.01 : 0.12
    const cloudSpin = reducedMotion ? 0.018 : 0.2
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * planetSpin
      planetRef.current.rotation.z = Math.sin(t * 0.2) * 0.02
      if (planetRef.current.material.map) {
        planetRef.current.material.map.offset.x += delta * (reducedMotion ? 0.001 : 0.004)
      }
    }
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * cloudSpin
    if (auraRef.current) auraRef.current.rotation.y += delta * 0.08

    for (let i = 0; i < orbitParams.length; i += 1) {
      const sat = satelliteRefs.current[i]
      const orbit = orbitParams[i]
      if (!sat || !orbit) continue
      const timeScale = reducedMotion ? 0.3 : 1
      const angle = t * orbit.speed * timeScale + orbit.phase
      const x = Math.cos(angle) * orbit.radius
      const z = Math.sin(angle) * orbit.radius
      sat.position.set(x, 0, z)
      sat.rotation.y = angle + Math.PI / 2
      sat.rotation.z = Math.sin(angle * 1.2) * 0.15
      const depth = THREE.MathUtils.mapLinear(z, -orbit.radius, orbit.radius, 0.78, 1.14)
      sat.scale.setScalar(depth)
    }
  })

  return (
    <>
      <ambientLight intensity={0.42} />
      <hemisphereLight intensity={0.4} color={theme.cloud} groundColor="#020617" />
      <directionalLight position={[4.4, 3.8, 4.6]} intensity={1.25} color="#ffffff" />
      <directionalLight position={[-3.2, -2.6, -1.5]} intensity={0.2} color={theme.cloud} />
      <pointLight position={[-3.4, -2.2, 2.4]} intensity={0.7} color={theme.ring} />
      <Stars radius={36} depth={62} count={reducedMotion ? 380 : 1300} factor={2.2} fade speed={0.32} />
      <Sparkles
        count={reducedMotion ? 10 : 30}
        size={2.3}
        speed={0.18}
        scale={[9, 9, 9]}
        color={theme.ring}
        opacity={0.34}
      />
      <Environment preset="sunset" />

      <group ref={planetGroupRef}>
        <mesh ref={planetRef}>
          <sphereGeometry args={[planetRadius, 96, 96]} />
          <meshPhysicalMaterial
            map={surfaceMap}
            color={theme.base}
            emissive={theme.emissive}
            emissiveIntensity={visual.emissiveIntensity}
            roughness={visual.roughness}
            metalness={visual.metalness}
            clearcoat={visual.clearcoat}
            clearcoatRoughness={0.16}
            sheen={0.4}
            sheenColor={theme.cloud}
          />
        </mesh>
        <mesh rotation={[0, 0, -0.2]}>
          <sphereGeometry args={[planetRadius + 0.01, 64, 64]} />
          <meshStandardMaterial color={theme.cloud} transparent opacity={0.04} roughness={0.55} metalness={0.06} />
        </mesh>
        <mesh ref={cloudsRef} scale={1.055}>
          <sphereGeometry args={[planetRadius, 64, 64]} />
          <meshStandardMaterial
            color={theme.cloud}
            transparent
            opacity={visual.cloudOpacity}
            depthWrite={false}
            roughness={1}
            metalness={0.02}
          />
        </mesh>
        <mesh scale={1.2}>
          <sphereGeometry args={[planetRadius, 48, 48]} />
          <meshBasicMaterial color={theme.ring} transparent opacity={0.16} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
        </mesh>
        {auraActive && (
          <mesh ref={auraRef} scale={1.32}>
            <sphereGeometry args={[planetRadius, 30, 30]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.12} blending={THREE.AdditiveBlending} />
          </mesh>
        )}
        <PlanetDecor planetId={planetId} />
      </group>

      {orbitParams.map((orbit, idx) => (
        <group key={`orbit-${orbit.id}`} rotation={[orbit.tiltX, orbit.spinY, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[orbit.radius, 0.006 + idx * 0.0018, 10, 220]} />
            <meshBasicMaterial color={theme.orbit} transparent opacity={0.16 + idx * 0.06} />
          </mesh>
        </group>
      ))}

      {orbitParams.map((orbit, index) => (
        <group key={`sat-${orbit.id}`} rotation={[orbit.tiltX, orbit.spinY, 0]}>
          <group ref={(node: THREE.Group | null) => (satelliteRefs.current[index] = node)}>
            <group scale={orbit.bodyScale}>
              <ShipModel shipId={orbit.id} ringColor={theme.ring} />
            </group>
            <pointLight position={[0, 0.02, 0.08]} intensity={0.14} color={theme.ring} distance={0.8} />
          </group>
        </group>
      ))}

      {!reducedMotion && (
        <EffectComposer>
          <Bloom intensity={0.72} luminanceThreshold={0.2} luminanceSmoothing={0.86} mipmapBlur />
          <Noise opacity={0.016} premultiply blendFunction={BlendFunction.SOFT_LIGHT} />
          <Vignette eskil={false} offset={0.2} darkness={0.5} />
        </EffectComposer>
      )}
    </>
  )
}

export function PlanetScene3D(props: PlanetScene3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8.2], fov: 40 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      className="planet-canvas"
    >
      <SceneContent {...props} />
    </Canvas>
  )
}
