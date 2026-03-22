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

type PlanetCinematic = {
  cameraZ: number
  cameraY: number
  cameraFov: number
  ambient: number
  hemiColor: string
  keyLightColor: string
  keyLightIntensity: number
  fillLightColor: string
  fillLightIntensity: number
  bloom: number
}

type OrbitProfile = {
  radiusOffset: number
  speed: number
  tiltX: number
  spinY: number
  phase: number
  bodyScale: number
  reverse?: boolean
  lineOpacity: number
  lineThickness: number
  trailColor: string
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

const PLANET_CINEMATIC: Record<string, PlanetCinematic> = {
  'earth-like': {
    cameraZ: 8.1,
    cameraY: 0.04,
    cameraFov: 40,
    ambient: 0.46,
    hemiColor: '#dbeafe',
    keyLightColor: '#ffffff',
    keyLightIntensity: 1.25,
    fillLightColor: '#bfdbfe',
    fillLightIntensity: 0.24,
    bloom: 0.66,
  },
  'gas-giant': {
    cameraZ: 8.6,
    cameraY: 0.14,
    cameraFov: 38,
    ambient: 0.4,
    hemiColor: '#fed7aa',
    keyLightColor: '#fff7ed',
    keyLightIntensity: 1.18,
    fillLightColor: '#fdba74',
    fillLightIntensity: 0.28,
    bloom: 0.74,
  },
  nebula: {
    cameraZ: 7.9,
    cameraY: 0.08,
    cameraFov: 42,
    ambient: 0.36,
    hemiColor: '#f0abfc',
    keyLightColor: '#faf5ff',
    keyLightIntensity: 1.15,
    fillLightColor: '#c084fc',
    fillLightIntensity: 0.3,
    bloom: 0.84,
  },
  'black-hole': {
    cameraZ: 7.4,
    cameraY: 0.03,
    cameraFov: 36,
    ambient: 0.24,
    hemiColor: '#7c2d12',
    keyLightColor: '#fff7ed',
    keyLightIntensity: 0.96,
    fillLightColor: '#f97316',
    fillLightIntensity: 0.38,
    bloom: 0.92,
  },
  'ice-world': {
    cameraZ: 8.0,
    cameraY: 0.1,
    cameraFov: 39,
    ambient: 0.5,
    hemiColor: '#eff6ff',
    keyLightColor: '#ffffff',
    keyLightIntensity: 1.3,
    fillLightColor: '#93c5fd',
    fillLightIntensity: 0.22,
    bloom: 0.7,
  },
  'ancient-ruins': {
    cameraZ: 8.45,
    cameraY: 0.12,
    cameraFov: 39,
    ambient: 0.34,
    hemiColor: '#fde68a',
    keyLightColor: '#fffbeb',
    keyLightIntensity: 1.08,
    fillLightColor: '#f59e0b',
    fillLightIntensity: 0.3,
    bloom: 0.78,
  },
}

function getOrbitProfile(
  shipId: string,
  index: number,
  _planetRadius: number,
): OrbitProfile {
  if (shipId === 'mining-drone') {
    return {
      radiusOffset: 0.48,
      speed: 0.34,
      tiltX: 0.34,
      spinY: 0.2,
      phase: 0.6,
      bodyScale: 1.42,
      lineOpacity: 0.28,
      lineThickness: 0.01,
      trailColor: '#22d3ee',
    }
  }
  if (shipId === 'explorer-scout') {
    return {
      radiusOffset: 0.86,
      speed: 0.56,
      tiltX: 0.8,
      spinY: 1.1,
      phase: 2.1,
      bodyScale: 1.36,
      lineOpacity: 0.24,
      lineThickness: 0.008,
      trailColor: '#a78bfa',
    }
  }
  return {
    radiusOffset: 1.2,
    speed: 0.48,
    tiltX: 1.05,
    spinY: 1.9,
    phase: 3.4 + index * 0.2,
    bodyScale: 1.48,
    reverse: true,
    lineOpacity: 0.22,
    lineThickness: 0.009,
    trailColor: '#f97316',
  }
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

function PlanetBiomeFx({
  planetId,
  reducedMotion,
}: {
  planetId: string
  reducedMotion: boolean
}) {
  const spinRef = useRef<THREE.Group | null>(null)
  const pulseRef = useRef<THREE.Mesh | null>(null)

  useFrame((state, delta) => {
    if (spinRef.current) {
      spinRef.current.rotation.y += delta * (reducedMotion ? 0.04 : 0.16)
      spinRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.08
    }
    if (pulseRef.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.06
      pulseRef.current.scale.setScalar(s)
    }
  })

  if (planetId === 'earth-like') {
    return (
      <group ref={spinRef}>
        <mesh rotation={[Math.PI / 2.05, 0.2, 0]}>
          <torusGeometry args={[1.76, 0.022, 10, 120]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.22} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    )
  }

  if (planetId === 'gas-giant') {
    return (
      <group ref={spinRef}>
        <Sparkles count={34} size={2.4} speed={0.42} scale={[4.6, 4.6, 4.6]} color="#fb923c" opacity={0.36} />
        <mesh ref={pulseRef} position={[0.86, 0.22, 1.38]}>
          <sphereGeometry args={[0.14, 16, 16]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    )
  }

  if (planetId === 'nebula') {
    return (
      <group ref={spinRef}>
        <mesh rotation={[Math.PI / 2.6, 0, 0]}>
          <torusGeometry args={[2.05, 0.18, 14, 160]} />
          <meshBasicMaterial color="#c084fc" transparent opacity={0.16} blending={THREE.AdditiveBlending} />
        </mesh>
        <Sparkles count={58} size={3} speed={0.22} scale={[5, 5, 5]} color="#e879f9" opacity={0.4} />
      </group>
    )
  }

  if (planetId === 'black-hole') {
    return (
      <group ref={spinRef}>
        <mesh rotation={[Math.PI / 2, 0.5, 0]}>
          <torusGeometry args={[1.95, 0.16, 16, 170]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.24} blending={THREE.AdditiveBlending} />
        </mesh>
        <mesh ref={pulseRef}>
          <ringGeometry args={[0.78, 1.18, 64]} />
          <meshBasicMaterial color="#fb923c" transparent opacity={0.22} side={THREE.DoubleSide} />
        </mesh>
      </group>
    )
  }

  if (planetId === 'ice-world') {
    return (
      <group ref={spinRef}>
        <mesh rotation={[Math.PI / 2.2, 0.4, 0]}>
          <torusGeometry args={[1.94, 0.035, 12, 120]} />
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.36} />
        </mesh>
        <Sparkles count={22} size={2.2} speed={0.16} scale={[4.8, 4.8, 4.8]} color="#dbeafe" opacity={0.28} />
      </group>
    )
  }

  if (planetId === 'ancient-ruins') {
    return (
      <group ref={spinRef}>
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 6]}>
          <torusGeometry args={[2.02, 0.02, 8, 64]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.24} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, -Math.PI / 9]}>
          <torusGeometry args={[1.86, 0.012, 6, 48]} />
          <meshBasicMaterial color="#fde68a" transparent opacity={0.28} />
        </mesh>
      </group>
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
  const cinematic = PLANET_CINEMATIC[planetId] ?? PLANET_CINEMATIC['earth-like']
  const cameraBaseRef = useRef({
    z: cinematic.cameraZ,
    y: cinematic.cameraY,
    fov: cinematic.cameraFov,
  })
  const surfaceMap = useMemo(() => createPlanetTexture(planetId, theme), [planetId, theme])
  const planetRadius = visual.radius

  useEffect(() => {
    tapScaleTargetRef.current = isTapBurst ? 1.06 : 1
  }, [isTapBurst])

  const orbitParams = useMemo(
    () =>
      ships.map((ship, index) => ({
        id: ship.id,
        ...getOrbitProfile(ship.id, index, planetRadius),
        radius: planetRadius + getOrbitProfile(ship.id, index, planetRadius).radiusOffset,
        bodyScale:
          getOrbitProfile(ship.id, index, planetRadius).bodyScale +
          Math.min(ship.level, 30) * 0.018,
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

    const cam = state.camera as THREE.PerspectiveCamera
    cam.position.x = cameraSmoothingRef.current.x
    cameraBaseRef.current.z = THREE.MathUtils.lerp(
      cameraBaseRef.current.z,
      cinematic.cameraZ,
      0.06,
    )
    cameraBaseRef.current.y = THREE.MathUtils.lerp(
      cameraBaseRef.current.y,
      cinematic.cameraY,
      0.06,
    )
    cameraBaseRef.current.fov = THREE.MathUtils.lerp(
      cameraBaseRef.current.fov,
      cinematic.cameraFov,
      0.06,
    )
    cam.position.y = cameraSmoothingRef.current.y + cameraBaseRef.current.y
    cam.position.z = cameraBaseRef.current.z
    if (Math.abs(cam.fov - cameraBaseRef.current.fov) > 0.05) {
      cam.fov = cameraBaseRef.current.fov
      cam.updateProjectionMatrix()
    }
    cam.lookAt(0, 0, 0)

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
      const direction = orbit.reverse ? -1 : 1
      const angle = t * orbit.speed * timeScale * direction + orbit.phase
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
      <ambientLight intensity={cinematic.ambient} />
      <hemisphereLight intensity={0.4} color={cinematic.hemiColor} groundColor="#020617" />
      <directionalLight
        position={[4.4, 3.8, 4.6]}
        intensity={cinematic.keyLightIntensity}
        color={cinematic.keyLightColor}
      />
      <directionalLight
        position={[-3.2, -2.6, -1.5]}
        intensity={cinematic.fillLightIntensity}
        color={cinematic.fillLightColor}
      />
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
        <PlanetBiomeFx planetId={planetId} reducedMotion={reducedMotion} />
      </group>

      {orbitParams.map((orbit, idx) => (
        <group key={`orbit-${orbit.id}`} rotation={[orbit.tiltX, orbit.spinY, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[orbit.radius, orbit.lineThickness + idx * 0.0012, 10, 220]} />
            <meshBasicMaterial color={theme.orbit} transparent opacity={orbit.lineOpacity + idx * 0.02} />
          </mesh>
        </group>
      ))}

      {orbitParams.map((orbit, index) => (
        <group key={`sat-${orbit.id}`} rotation={[orbit.tiltX, orbit.spinY, 0]}>
          <group ref={(node: THREE.Group | null) => (satelliteRefs.current[index] = node)}>
            <group scale={orbit.bodyScale}>
              <ShipModel shipId={orbit.id} ringColor={theme.ring} />
            </group>
            <mesh position={[0, -0.02, -0.18]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.015, 0.06, 0.26, 10, 1, true]} />
              <meshBasicMaterial color={orbit.trailColor} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
            </mesh>
            <mesh position={[0, -0.02, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.004, 0.03, 0.22, 8, 1, true]} />
              <meshBasicMaterial color={orbit.trailColor} transparent opacity={0.22} blending={THREE.AdditiveBlending} />
            </mesh>
            <pointLight position={[0, 0.02, 0.08]} intensity={0.14} color={theme.ring} distance={0.8} />
          </group>
        </group>
      ))}

      {!reducedMotion && (
        <EffectComposer>
          <Bloom
            intensity={cinematic.bloom}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.86}
            mipmapBlur
          />
          <Noise opacity={0.016} premultiply blendFunction={BlendFunction.SOFT_LIGHT} />
          <Vignette eskil={false} offset={0.2} darkness={0.5} />
        </EffectComposer>
      )}
    </>
  )
}

export function PlanetScene3D(props: PlanetScene3DProps) {
  const cinematic = PLANET_CINEMATIC[props.planetId] ?? PLANET_CINEMATIC['earth-like']
  return (
    <Canvas
      camera={{ position: [0, cinematic.cameraY, cinematic.cameraZ], fov: cinematic.cameraFov }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      className="planet-canvas"
    >
      <SceneContent {...props} />
    </Canvas>
  )
}
