import { Environment, Sparkles, Stars } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
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
  secondary: string
  emissive: string
  cloud: string
  ring: string
}

const THEMES: Record<string, Theme> = {
  'earth-like': {
    base: '#3b82f6',
    secondary: '#0f4ec7',
    emissive: '#22d3ee',
    cloud: '#dbeafe',
    ring: '#38bdf8',
  },
  'gas-giant': {
    base: '#f97316',
    secondary: '#b45309',
    emissive: '#fdba74',
    cloud: '#fed7aa',
    ring: '#fb923c',
  },
  nebula: {
    base: '#7c3aed',
    secondary: '#4c1d95',
    emissive: '#c084fc',
    cloud: '#f0abfc',
    ring: '#a78bfa',
  },
  'black-hole': {
    base: '#0f172a',
    secondary: '#030712',
    emissive: '#f59e0b',
    cloud: '#fb923c',
    ring: '#f59e0b',
  },
  'ice-world': {
    base: '#60a5fa',
    secondary: '#2563eb',
    emissive: '#bfdbfe',
    cloud: '#eff6ff',
    ring: '#93c5fd',
  },
  'ancient-ruins': {
    base: '#d97706',
    secondary: '#92400e',
    emissive: '#facc15',
    cloud: '#fde68a',
    ring: '#fbbf24',
  },
}

function createPlanetTexture(theme: Theme): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return new THREE.CanvasTexture(canvas)
  }

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
  gradient.addColorStop(0, theme.base)
  gradient.addColorStop(0.5, theme.secondary)
  gradient.addColorStop(1, theme.base)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const hexToRgb = (hex: string) => {
    const normalized = hex.replace('#', '')
    const value = Number.parseInt(normalized, 16)
    const r = (value >> 16) & 255
    const g = (value >> 8) & 255
    const b = value & 255
    return { r, g, b }
  }
  const emissive = hexToRgb(theme.emissive)

  for (let i = 0; i < 36; i += 1) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    const radius = 34 + Math.random() * 110
    const alpha = 0.05 + Math.random() * 0.1
    const blob = ctx.createRadialGradient(x, y, 2, x, y, radius)
    blob.addColorStop(
      0,
      `rgba(${emissive.r}, ${emissive.g}, ${emissive.b}, ${alpha})`,
    )
    blob.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = blob
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.anisotropy = 4
  return texture
}

function SceneContent({
  planetId,
  ships,
  auraActive = false,
  pointerRef,
  lastInputAtRef,
  reducedMotion,
}: PlanetScene3DProps) {
  const planetRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhysicalMaterial> | null>(null)
  const cloudsRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> | null>(null)
  const auraRef = useRef<THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial> | null>(null)
  const satelliteRefs = useRef<Array<THREE.Group | null>>([])
  const cameraSmoothingRef = useRef({ x: 0, y: 0 })
  const theme = THEMES[planetId] ?? THEMES['earth-like']
  const surfaceMap = useMemo(() => createPlanetTexture(theme), [theme])

  const orbitParams = useMemo(
    () =>
      ships.map((ship, index) => ({
        id: ship.id,
        radius: 2.58 + index * 0.44,
        speed: 0.42 + index * 0.14,
        tiltX: 0.55 + index * 0.33,
        spinY: index * 0.92,
        phase: index * 2.2,
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

    const planetSpin = reducedMotion ? 0.01 : 0.12
    const cloudSpin = reducedMotion ? 0.018 : 0.2
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * planetSpin
      planetRef.current.rotation.z = Math.sin(t * 0.2) * 0.02
      if (planetRef.current.material.map) {
        planetRef.current.material.map.offset.x += delta * (reducedMotion ? 0.001 : 0.004)
      }
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
      const y = Math.sin(angle * 1.35 + orbit.phase) * 0.42

      sat.position.set(x, y, z)
      sat.rotation.y = angle + Math.PI / 2
      sat.rotation.z = Math.sin(angle * 1.6) * 0.2
      const depth = THREE.MathUtils.mapLinear(z, -orbit.radius, orbit.radius, 0.75, 1.12)
      sat.scale.setScalar(depth)
    }
  })

  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.32} />
      <directionalLight position={[4.4, 3.8, 4.6]} intensity={1.35} color="#ffffff" />
      <directionalLight position={[-3.2, -2.6, -1.5]} intensity={0.25} color={theme.cloud} />
      <pointLight position={[-3.4, -2.2, 2.4]} intensity={0.7} color={theme.ring} />
      <Stars radius={24} depth={38} count={850} factor={2.5} fade speed={0.35} />
      <Sparkles
        count={26}
        size={2.3}
        speed={0.18}
        scale={[8, 8, 8]}
        color={theme.ring}
        opacity={0.45}
      />
      <Environment preset="sunset" />

      <mesh ref={planetRef}>
        <sphereGeometry args={[1.95, 96, 96]} />
        <meshPhysicalMaterial
          map={surfaceMap}
          color={theme.base}
          emissive={theme.emissive}
          emissiveIntensity={0.22}
          roughness={0.62}
          metalness={0.14}
          clearcoat={1}
          clearcoatRoughness={0.16}
          sheen={0.4}
          sheenColor={theme.cloud}
        />
      </mesh>

      <mesh ref={cloudsRef} scale={1.045}>
        <sphereGeometry args={[1.95, 64, 64]} />
        <meshStandardMaterial
          color={theme.cloud}
          transparent
          opacity={0.12}
          depthWrite={false}
          roughness={1}
          metalness={0.02}
        />
      </mesh>

      <mesh scale={1.13}>
        <sphereGeometry args={[1.95, 48, 48]} />
        <meshBasicMaterial
          color={theme.ring}
          transparent
          opacity={0.16}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
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

      {orbitParams.map((orbit, idx) => (
        <group key={`orbit-${orbit.id}`} rotation={[orbit.tiltX, orbit.spinY, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[orbit.radius, 0.008 + idx * 0.002, 10, 220]} />
            <meshBasicMaterial color={theme.ring} transparent opacity={0.25 + idx * 0.07} />
          </mesh>
        </group>
      ))}

      {orbitParams.map((orbit, index) => (
        <group key={`sat-${orbit.id}`} rotation={[orbit.tiltX, orbit.spinY, 0]}>
          <group ref={(node: THREE.Group | null) => (satelliteRefs.current[index] = node)}>
            <mesh>
              <icosahedronGeometry args={[0.13, 2]} />
              <meshStandardMaterial
                color="#f8fafc"
                emissive={theme.ring}
                emissiveIntensity={0.5}
                roughness={0.28}
                metalness={0.8}
              />
            </mesh>
            <mesh position={[0.19, 0, 0]} rotation={[0, 0.24, 0.2]}>
              <boxGeometry args={[0.24, 0.04, 0.11]} />
              <meshStandardMaterial color="#64748b" roughness={0.36} metalness={0.88} />
            </mesh>
            <mesh position={[-0.19, 0, 0]} rotation={[0, -0.24, -0.2]}>
              <boxGeometry args={[0.24, 0.04, 0.11]} />
              <meshStandardMaterial color="#64748b" roughness={0.36} metalness={0.88} />
            </mesh>
            <mesh position={[0.02, 0.03, 0.09]}>
              <sphereGeometry args={[0.03, 12, 12]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.65} />
            </mesh>
          </group>
        </group>
      ))}

      {!reducedMotion && (
        <EffectComposer>
          <Bloom
            intensity={0.62}
            luminanceThreshold={0.22}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Noise opacity={0.02} premultiply blendFunction={BlendFunction.SOFT_LIGHT} />
          <Vignette eskil={false} offset={0.2} darkness={0.5} />
        </EffectComposer>
      )}
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
