import { Environment, Sparkles, Stars } from '@react-three/drei'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
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
  orbit: string
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

function createPlanetTexture(planetId: string, theme: Theme): THREE.CanvasTexture {
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

  for (let i = 0; i < 26; i += 1) {
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

  if (planetId === 'gas-giant') {
    ctx.globalAlpha = 0.28
    for (let i = 0; i < 18; i += 1) {
      const y = (i / 18) * canvas.height
      ctx.fillStyle = i % 2 === 0 ? '#fcd34d' : '#fb923c'
      ctx.fillRect(0, y, canvas.width, 16 + Math.sin(i) * 8)
    }
    ctx.globalAlpha = 1
  }

  if (planetId === 'earth-like') {
    ctx.globalAlpha = 0.35
    ctx.fillStyle = '#16a34a'
    for (let i = 0; i < 10; i += 1) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      ctx.beginPath()
      ctx.ellipse(x, y, 70 + Math.random() * 60, 30 + Math.random() * 24, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  if (planetId === 'ice-world') {
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = '#e0f2fe'
    ctx.lineWidth = 3
    for (let i = 0; i < 26; i += 1) {
      const y = Math.random() * canvas.height
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y + Math.random() * 22 - 11)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  if (planetId === 'ancient-ruins') {
    ctx.globalAlpha = 0.22
    ctx.strokeStyle = '#fef08a'
    ctx.lineWidth = 2
    for (let i = 0; i < 18; i += 1) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      ctx.strokeRect(x, y, 24 + Math.random() * 36, 12 + Math.random() * 16)
    }
    ctx.globalAlpha = 1
  }

  if (planetId === 'nebula') {
    ctx.globalAlpha = 0.32
    for (let i = 0; i < 22; i += 1) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const r = 30 + Math.random() * 90
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, i % 2 === 0 ? '#f0abfc' : '#c084fc')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  if (planetId === 'black-hole') {
    const hole = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 18, canvas.width / 2, canvas.height / 2, 120)
    hole.addColorStop(0, '#020617')
    hole.addColorStop(0.45, '#030712')
    hole.addColorStop(0.55, '#f59e0b')
    hole.addColorStop(0.72, '#fb923c')
    hole.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.58
    ctx.fillStyle = hole
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalAlpha = 1
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
  const surfaceMap = useMemo(() => createPlanetTexture(planetId, theme), [planetId, theme])
  const shipIconUrls = useMemo(() => ships.map((ship) => ship.icon), [ships])
  const shipTextures = useLoader(THREE.TextureLoader, shipIconUrls)

  for (const texture of shipTextures) {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = 4
  }

  const orbitParams = useMemo(
    () =>
      ships.map((ship, index) => ({
        id: ship.id,
        radius: 2.15 + index * 0.33,
        speed: 0.42 + index * 0.14,
        tiltX: 0.45 + index * 0.3,
        spinY: index * 0.92,
        phase: index * 2.2,
        bodyScale: 1 + Math.min(ship.level, 30) * 0.012,
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
    state.camera.position.z = 8.2
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

      <mesh ref={planetRef}>
        <sphereGeometry args={[1.52, 96, 96]} />
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

      <mesh rotation={[0, 0, -0.2]}>
        <sphereGeometry args={[1.53, 64, 64]} />
        <meshStandardMaterial
          color={theme.cloud}
          transparent
          opacity={0.04}
          roughness={0.55}
          metalness={0.06}
        />
      </mesh>

      <mesh ref={cloudsRef} scale={1.055}>
        <sphereGeometry args={[1.52, 64, 64]} />
        <meshStandardMaterial
          color={theme.cloud}
          transparent
          opacity={0.12}
          depthWrite={false}
          roughness={1}
          metalness={0.02}
        />
      </mesh>

      <mesh scale={1.2}>
        <sphereGeometry args={[1.52, 48, 48]} />
        <meshBasicMaterial
          color={theme.ring}
          transparent
          opacity={0.16}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {auraActive && (
        <mesh ref={auraRef} scale={1.32}>
          <sphereGeometry args={[1.52, 30, 30]} />
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
            <torusGeometry args={[orbit.radius, 0.006 + idx * 0.0018, 10, 220]} />
            <meshBasicMaterial color={theme.orbit} transparent opacity={0.16 + idx * 0.06} />
          </mesh>
        </group>
      ))}

      {planetId === 'gas-giant' && (
        <mesh rotation={[Math.PI / 2.5, 0.2, 0]}>
          <torusGeometry args={[2.06, 0.075, 18, 140]} />
          <meshStandardMaterial color="#fdba74" transparent opacity={0.42} roughness={0.5} metalness={0.18} />
        </mesh>
      )}

      {planetId === 'black-hole' && (
        <group>
          <mesh>
            <sphereGeometry args={[0.56, 40, 40]} />
            <meshBasicMaterial color="#020617" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0.3, 0]}>
            <torusGeometry args={[1.42, 0.22, 20, 180]} />
            <meshBasicMaterial color="#fb923c" transparent opacity={0.28} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      )}

      {planetId === 'ice-world' && (
        <group>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={`ice-spire-${i}`} position={[Math.cos(i * 1.7) * 1.28, 0.2 + (i % 2) * 0.2, Math.sin(i * 1.7) * 1.28]} rotation={[0.3, i * 1.4, 0]}>
              <coneGeometry args={[0.07, 0.28, 6]} />
              <meshStandardMaterial color="#dbeafe" emissive="#93c5fd" emissiveIntensity={0.2} />
            </mesh>
          ))}
        </group>
      )}

      {planetId === 'ancient-ruins' && (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.68, 0.03, 12, 120]} />
            <meshStandardMaterial color="#fde68a" transparent opacity={0.28} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={`ruin-${i}`} position={[Math.cos(i * 1.2) * 1.62, 0.02, Math.sin(i * 1.2) * 1.62]}>
              <boxGeometry args={[0.06, 0.13 + (i % 2) * 0.05, 0.06]} />
              <meshStandardMaterial color="#fcd34d" metalness={0.35} roughness={0.65} />
            </mesh>
          ))}
        </group>
      )}

      {planetId === 'nebula' && (
        <Sparkles count={24} size={3.2} speed={0.12} scale={[4.4, 4.4, 4.4]} color="#f0abfc" opacity={0.28} />
      )}

      {orbitParams.map((orbit, index) => (
        <group key={`sat-${orbit.id}`} rotation={[orbit.tiltX, orbit.spinY, 0]}>
          <group ref={(node: THREE.Group | null) => (satelliteRefs.current[index] = node)}>
            <mesh scale={orbit.bodyScale} rotation={[0.12, 0.25, 0]}>
              <capsuleGeometry args={[0.055, 0.18, 8, 14]} />
              <meshStandardMaterial
                color="#f8fafc"
                emissive={theme.ring}
                emissiveIntensity={0.3}
                roughness={0.24}
                metalness={0.9}
              />
            </mesh>
            <mesh position={[0.2, 0, 0]} rotation={[0, 0.26, 0.22]}>
              <boxGeometry args={[0.25, 0.035, 0.1]} />
              <meshStandardMaterial color="#64748b" roughness={0.28} metalness={0.95} />
            </mesh>
            <mesh position={[-0.2, 0, 0]} rotation={[0, -0.26, -0.22]}>
              <boxGeometry args={[0.25, 0.035, 0.1]} />
              <meshStandardMaterial color="#64748b" roughness={0.28} metalness={0.95} />
            </mesh>
            <sprite position={[0, 0.12, 0]}>
              <spriteMaterial
                map={shipTextures[index]}
                transparent
                depthWrite={false}
                sizeAttenuation
                color="#ffffff"
              />
            </sprite>
            <pointLight position={[0, 0.02, 0.08]} intensity={0.14} color={theme.ring} distance={0.8} />
          </group>
        </group>
      ))}

      {!reducedMotion && (
        <EffectComposer>
          <Bloom
            intensity={0.72}
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
