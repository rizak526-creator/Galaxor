import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DefaultRenderingPipeline,
  DirectionalLight,
  DynamicTexture,
  Engine,
  FresnelParameters,
  HemisphericLight,
  Matrix,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  type Nullable,
} from '@babylonjs/core'
import '@babylonjs/loaders'
import type { FleetShip } from './PlanetMap'

type PlanetSceneBabylonProps = {
  planetId: string
  ships: FleetShip[]
  auraActive?: boolean
  isTapBurst?: boolean
  tapBurstTick?: number
  pointerRef: MutableRefObject<{ x: number; y: number }>
  lastInputAtRef: MutableRefObject<number>
  reducedMotion: boolean
}

type Theme = {
  base: string
  secondary: string
  cloud: string
  ring: string
  orbit: string
}

type SatelliteVariant = 'drone' | 'frigate' | 'ring' | 'probe' | 'hauler'

type OrbitLayout = {
  radius: number
  tiltX: number
  spinY: number
  speed: number
  phase: number
  reverse: boolean
  variant: SatelliteVariant
}

const THEMES: Record<string, Theme> = {
  'earth-like': {
    base: '#3b82f6',
    secondary: '#0f4ec7',
    cloud: '#dbeafe',
    ring: '#38bdf8',
    orbit: '#7dd3fc',
  },
  'gas-giant': {
    base: '#b97945',
    secondary: '#6f3f25',
    cloud: '#f6d3b2',
    ring: '#c98a57',
    orbit: '#e8b686',
  },
  nebula: {
    base: '#7c3aed',
    secondary: '#4c1d95',
    cloud: '#f0abfc',
    ring: '#a78bfa',
    orbit: '#c4b5fd',
  },
  'black-hole': {
    base: '#0f172a',
    secondary: '#030712',
    cloud: '#fb923c',
    ring: '#f59e0b',
    orbit: '#fb923c',
  },
  'ice-world': {
    base: '#60a5fa',
    secondary: '#2563eb',
    cloud: '#eff6ff',
    ring: '#93c5fd',
    orbit: '#dbeafe',
  },
  'ancient-ruins': {
    base: '#d97706',
    secondary: '#92400e',
    cloud: '#fde68a',
    ring: '#fbbf24',
    orbit: '#fde68a',
  },
}

const PLANET_ORBIT_LAYOUTS: Record<string, OrbitLayout[]> = {
  'earth-like': [
    { radius: 1.78, tiltX: 1.02, spinY: 0.2, speed: 0.44, phase: 0.3, reverse: false, variant: 'drone' },
    { radius: 2.32, tiltX: 0.82, spinY: 0.86, speed: 0.58, phase: 2.4, reverse: false, variant: 'frigate' },
    { radius: 2.86, tiltX: 1.24, spinY: 1.66, speed: 0.36, phase: 4.1, reverse: true, variant: 'ring' },
  ],
  'gas-giant': [
    { radius: 2.08, tiltX: 0.95, spinY: 0.12, speed: 0.34, phase: 0.9, reverse: false, variant: 'hauler' },
    { radius: 2.72, tiltX: 1.33, spinY: 0.92, speed: 0.41, phase: 2.8, reverse: true, variant: 'probe' },
    { radius: 3.16, tiltX: 0.67, spinY: 1.8, speed: 0.52, phase: 4.7, reverse: false, variant: 'frigate' },
  ],
  nebula: [
    { radius: 1.92, tiltX: 1.28, spinY: 0.35, speed: 0.62, phase: 0.5, reverse: true, variant: 'ring' },
    { radius: 2.44, tiltX: 0.75, spinY: 1.16, speed: 0.47, phase: 2.2, reverse: false, variant: 'drone' },
    { radius: 2.98, tiltX: 1.15, spinY: 2.3, speed: 0.55, phase: 4.05, reverse: false, variant: 'probe' },
  ],
  'black-hole': [
    { radius: 1.86, tiltX: 1.34, spinY: 0.45, speed: 0.72, phase: 1.2, reverse: false, variant: 'frigate' },
    { radius: 2.38, tiltX: 0.66, spinY: 1.22, speed: 0.68, phase: 2.95, reverse: true, variant: 'probe' },
    { radius: 2.84, tiltX: 1.07, spinY: 2.05, speed: 0.64, phase: 4.4, reverse: false, variant: 'hauler' },
  ],
  'ice-world': [
    { radius: 1.84, tiltX: 0.86, spinY: 0.26, speed: 0.39, phase: 0.6, reverse: false, variant: 'ring' },
    { radius: 2.35, tiltX: 1.19, spinY: 1.12, speed: 0.52, phase: 2.6, reverse: false, variant: 'drone' },
    { radius: 2.8, tiltX: 0.7, spinY: 1.76, speed: 0.45, phase: 3.9, reverse: true, variant: 'frigate' },
  ],
  'ancient-ruins': [
    { radius: 1.94, tiltX: 1.1, spinY: 0.1, speed: 0.41, phase: 0.35, reverse: false, variant: 'hauler' },
    { radius: 2.48, tiltX: 0.72, spinY: 0.94, speed: 0.54, phase: 2.35, reverse: true, variant: 'probe' },
    { radius: 2.98, tiltX: 1.29, spinY: 1.86, speed: 0.36, phase: 4.25, reverse: false, variant: 'drone' },
  ],
}

function hashPlanetId(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) + 1
}

function makeAlbedo(scene: Scene, planetId: string, theme: Theme, seed: number) {
  const texture = new DynamicTexture(`planet-albedo-${seed}`, { width: 1024, height: 512 }, scene, false)
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, 0, 1024, 512)
  g.addColorStop(0, theme.base)
  g.addColorStop(0.5, theme.secondary)
  g.addColorStop(1, theme.base)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1024, 512)

  const rand = (n: number) => {
    const x = Math.sin(seed * 997 + n * 71) * 10000
    return x - Math.floor(x)
  }

  for (let i = 0; i < 30; i += 1) {
    const x = rand(i * 3 + 1) * 1024
    const y = rand(i * 3 + 2) * 512
    const r = 24 + rand(i * 3 + 3) * 98
    const blob = ctx.createRadialGradient(x, y, 0, x, y, r)
    blob.addColorStop(0, i % 2 === 0 ? '#ffffff33' : '#00000030')
    blob.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = blob
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  if (planetId === 'earth-like') {
    for (let i = 0; i < 11; i += 1) {
      const x = rand(i + 41) * 1024
      const y = rand(i + 75) * 512
      const w = 120 + rand(i + 92) * 180
      const h = 40 + rand(i + 113) * 80
      ctx.fillStyle = i % 2 === 0 ? '#2f855a99' : '#65a30d88'
      ctx.beginPath()
      ctx.ellipse(x, y, w, h, rand(i + 131) * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#e0f2fecc'
    ctx.beginPath()
    ctx.ellipse(500, 30, 460, 50, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(490, 482, 430, 58, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (planetId === 'gas-giant') {
    for (let y = 0; y < 512; y += 18) {
      const stripe = 0.2 + Math.sin(y * 0.05 + seed * 0.0002) * 0.12
      ctx.fillStyle = `rgba(255,220,180,${stripe.toFixed(3)})`
      ctx.fillRect(0, y, 1024, 12 + ((y / 18) % 4))
    }
    const storm = ctx.createRadialGradient(710, 286, 8, 710, 286, 120)
    storm.addColorStop(0, '#fff7d6dd')
    storm.addColorStop(0.45, '#f59e0b88')
    storm.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = storm
    ctx.beginPath()
    ctx.ellipse(710, 286, 170, 92, 0.26, 0, Math.PI * 2)
    ctx.fill()
  } else if (planetId === 'nebula') {
    for (let i = 0; i < 12; i += 1) {
      ctx.strokeStyle = i % 2 === 0 ? '#f5d0fe99' : '#67e8f988'
      ctx.lineWidth = 5 + rand(i + 201) * 9
      ctx.beginPath()
      ctx.moveTo(rand(i + 222) * 1024, rand(i + 255) * 512)
      ctx.bezierCurveTo(
        rand(i + 276) * 1024,
        rand(i + 301) * 512,
        rand(i + 324) * 1024,
        rand(i + 345) * 512,
        rand(i + 366) * 1024,
        rand(i + 389) * 512,
      )
      ctx.stroke()
    }
  } else if (planetId === 'black-hole') {
    ctx.fillStyle = '#04060e'
    ctx.fillRect(0, 0, 1024, 512)
    for (let i = 0; i < 16; i += 1) {
      ctx.strokeStyle = i % 2 === 0 ? '#fb923cbb' : '#f59e0b88'
      ctx.lineWidth = 2 + rand(i + 431) * 4
      ctx.beginPath()
      const x = rand(i + 462) * 1024
      const y = rand(i + 493) * 512
      ctx.moveTo(x, y)
      ctx.lineTo(x + (rand(i + 521) - 0.5) * 160, y + (rand(i + 547) - 0.5) * 120)
      ctx.stroke()
    }
  } else if (planetId === 'ice-world') {
    ctx.fillStyle = '#e0f2fe66'
    ctx.fillRect(0, 0, 1024, 512)
    for (let i = 0; i < 20; i += 1) {
      ctx.strokeStyle = i % 3 === 0 ? '#ecfeffcc' : '#a5f3fcaa'
      ctx.lineWidth = 1.4 + rand(i + 571) * 2.8
      ctx.beginPath()
      const x = rand(i + 602) * 1024
      const y = rand(i + 631) * 512
      ctx.moveTo(x, y)
      ctx.lineTo(x + (rand(i + 665) - 0.5) * 220, y + (rand(i + 687) - 0.5) * 150)
      ctx.stroke()
    }
  } else if (planetId === 'ancient-ruins') {
    for (let i = 0; i < 10; i += 1) {
      const x = rand(i + 712) * 1024
      const y = rand(i + 739) * 512
      const r = 28 + rand(i + 761) * 76
      ctx.fillStyle = '#78350faa'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#f59e0b88'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, r * 0.62, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (let i = 0; i < 9; i += 1) {
      const x = rand(i + 789) * 1024
      const y = rand(i + 811) * 512
      ctx.fillStyle = '#16653477'
      ctx.beginPath()
      ctx.ellipse(x, y, 55 + rand(i + 834) * 80, 24 + rand(i + 853) * 44, rand(i + 877), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  texture.update(false)
  return texture
}

function makeNormalLike(scene: Scene, seed: number) {
  const texture = new DynamicTexture(`planet-normal-${seed}`, { width: 512, height: 512 }, scene, false)
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D
  const rand = (n: number) => {
    const x = Math.sin(seed * 131 + n * 53) * 10000
    return x - Math.floor(x)
  }
  ctx.fillStyle = '#7f7fff'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 180; i += 1) {
    const x = rand(i + 1) * 512
    const y = rand(i + 2) * 512
    const r = 6 + rand(i + 3) * 20
    const alpha = 0.08 + rand(i + 4) * 0.12
    ctx.fillStyle = `rgba(127,127,255,${alpha.toFixed(3)})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  texture.update(false)
  return texture
}

function makeCityLights(scene: Scene, seed: number) {
  const texture = new DynamicTexture(`planet-city-${seed}`, { width: 1024, height: 512 }, scene, false)
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 1024, 512)
  const rand = (n: number) => {
    const x = Math.sin(seed * 313 + n * 47) * 10000
    return x - Math.floor(x)
  }
  for (let i = 0; i < 300; i += 1) {
    const x = rand(i + 1) * 1024
    const y = rand(i + 2) * 512
    const r = 1.2 + rand(i + 3) * 2.8
    const a = 0.2 + rand(i + 4) * 0.7
    const blob = ctx.createRadialGradient(x, y, 0, x, y, r)
    blob.addColorStop(0, `rgba(255,220,140,${a.toFixed(3)})`)
    blob.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = blob
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  texture.update(false)
  return texture
}

type OrbitProfileMeta = OrbitLayout & {
  id: string
}

function createSatelliteModel(
  scene: Scene,
  sat: TransformNode,
  variant: SatelliteVariant,
  id: string,
  theme: Theme,
  index: number,
) {
  if (variant === 'frigate') {
    const body = MeshBuilder.CreateCylinder(`sat-body-${id}`, { height: 0.28, diameterTop: 0.045, diameterBottom: 0.09, tessellation: 12 }, scene)
    body.parent = sat
    body.rotation.x = Math.PI * 0.5
    const bodyMat = new PBRMaterial(`sat-body-mat-${id}`, scene)
    bodyMat.albedoColor = Color3.FromHexString('#cbd5e1')
    bodyMat.metallic = 0.94
    bodyMat.roughness = 0.16
    body.material = bodyMat

    const wingL = MeshBuilder.CreateBox(`sat-wing-l-${id}`, { width: 0.16, height: 0.012, depth: 0.07 }, scene)
    wingL.parent = sat
    wingL.position.x = -0.12
    wingL.position.z = 0.02
    wingL.rotation.z = 0.16
    const wingR = wingL.clone(`sat-wing-r-${id}`)
    wingR.parent = sat
    wingR.position.x = 0.12
    wingR.rotation.z = -0.16
  } else if (variant === 'ring') {
    const body = MeshBuilder.CreateSphere(`sat-body-${id}`, { diameter: 0.14, segments: 10 }, scene)
    body.parent = sat
    const bodyMat = new PBRMaterial(`sat-body-mat-${id}`, scene)
    bodyMat.albedoColor = Color3.FromHexString('#dbeafe')
    bodyMat.metallic = 0.84
    bodyMat.roughness = 0.24
    body.material = bodyMat

    const ring = MeshBuilder.CreateTorus(`sat-ring-${id}`, { diameter: 0.3, thickness: 0.016, tessellation: 36 }, scene)
    ring.parent = sat
    ring.rotation.x = Math.PI * 0.5
    const ringMat = new StandardMaterial(`sat-ring-mat-${id}`, scene)
    ringMat.emissiveColor = Color3.FromHexString(theme.ring).scale(0.68)
    ringMat.alpha = 0.86
    ring.material = ringMat
  } else if (variant === 'probe') {
    const body = MeshBuilder.CreatePolyhedron(`sat-body-${id}`, { type: 1, size: 0.12 }, scene)
    body.parent = sat
    const bodyMat = new PBRMaterial(`sat-body-mat-${id}`, scene)
    bodyMat.albedoColor = Color3.FromHexString('#f1f5f9')
    bodyMat.metallic = 0.91
    bodyMat.roughness = 0.21
    body.material = bodyMat

    for (let a = 0; a < 3; a += 1) {
      const theta = (a / 3) * Math.PI * 2
      const fin = MeshBuilder.CreateBox(`sat-fin-${id}-${a}`, { width: 0.12, height: 0.014, depth: 0.035 }, scene)
      fin.parent = sat
      fin.position.x = Math.cos(theta) * 0.13
      fin.position.y = Math.sin(theta) * 0.13
      fin.rotation.z = theta
    }
  } else if (variant === 'hauler') {
    const body = MeshBuilder.CreateBox(`sat-body-${id}`, { width: 0.22, height: 0.09, depth: 0.16 }, scene)
    body.parent = sat
    const bodyMat = new PBRMaterial(`sat-body-mat-${id}`, scene)
    bodyMat.albedoColor = Color3.FromHexString('#94a3b8')
    bodyMat.metallic = 0.86
    bodyMat.roughness = 0.28
    body.material = bodyMat

    const cargo = MeshBuilder.CreateBox(`sat-cargo-${id}`, { width: 0.09, height: 0.06, depth: 0.08 }, scene)
    cargo.parent = sat
    cargo.position.y = 0.08
    cargo.position.z = -0.03
    const cargoMat = new StandardMaterial(`sat-cargo-mat-${id}`, scene)
    cargoMat.diffuseColor = Color3.FromHexString('#475569')
    cargoMat.emissiveColor = Color3.FromHexString('#0ea5e9').scale(0.24)
    cargo.material = cargoMat
  } else {
    const body = MeshBuilder.CreateBox(`sat-body-${id}`, { width: 0.18, height: 0.08, depth: 0.15 }, scene)
    body.parent = sat
    const bodyMat = new PBRMaterial(`sat-body-mat-${id}`, scene)
    bodyMat.albedoColor = Color3.FromHexString('#cbd5e1')
    bodyMat.metallic = 0.92
    bodyMat.roughness = 0.2
    body.material = bodyMat

    const armL = MeshBuilder.CreateBox(`sat-arm-l-${id}`, { width: 0.12, height: 0.018, depth: 0.05 }, scene)
    armL.parent = sat
    armL.position.x = -0.14
    armL.position.y = -0.01
    armL.rotation.z = 0.2
    const armR = armL.clone(`sat-arm-r-${id}`)
    armR.parent = sat
    armR.position.x = 0.14
    armR.rotation.z = -0.2
  }

  const cockpit = MeshBuilder.CreateSphere(`sat-cockpit-${id}`, { diameter: 0.045, segments: 10 }, scene)
  cockpit.parent = sat
  cockpit.position.set(0, 0.03, 0.05)
  const cockpitMat = new StandardMaterial(`sat-cockpit-mat-${id}`, scene)
  cockpitMat.emissiveColor = Color3.FromHexString(index % 2 === 0 ? '#7dd3fc' : '#fbbf24').scale(0.72)
  cockpitMat.alpha = 0.86
  cockpit.material = cockpitMat

  const engineFlame = MeshBuilder.CreateCylinder(
    `sat-flame-${id}`,
    { diameterTop: 0.012, diameterBottom: 0.055, height: 0.26, tessellation: 10 },
    scene,
  )
  engineFlame.parent = sat
  engineFlame.position.z = -0.18
  engineFlame.rotation.x = Math.PI * 0.5
  const flameMat = new StandardMaterial(`sat-flame-mat-${id}`, scene)
  flameMat.emissiveColor = Color3.FromHexString(index === 2 ? '#f97316' : '#22d3ee')
  flameMat.alpha = 0.74
  flameMat.disableLighting = true
  engineFlame.material = flameMat
}

export function PlanetSceneBabylon({
  planetId,
  ships,
  auraActive = false,
  isTapBurst = false,
  tapBurstTick = 0,
  pointerRef,
  lastInputAtRef,
  reducedMotion,
}: PlanetSceneBabylonProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const engineRef = useRef<Nullable<Engine>>(null)
  const sceneRef = useRef<Nullable<Scene>>(null)
  const tapScaleRef = useRef(1)
  const tapVelocityRef = useRef(0)
  const tapGlowRef = useRef(0)

  const qualityMode = useMemo(() => {
    const value = import.meta.env.VITE_QUALITY_MODE?.toLowerCase()
    if (value === 'low' || value === 'high' || value === 'auto') return value
    return 'auto'
  }, [])

  useEffect(() => {
    tapVelocityRef.current += reducedMotion ? 0.22 : 0.38
    tapGlowRef.current = Math.min(1, tapGlowRef.current + 0.45)
  }, [reducedMotion, tapBurstTick])

  useEffect(() => {
    if (!isTapBurst) return
    tapVelocityRef.current += reducedMotion ? 0.1 : 0.16
  }, [isTapBurst, reducedMotion])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const forceLow = reducedMotion || qualityMode === 'low'
    const engine = new Engine(canvas, !forceLow, {
      preserveDrawingBuffer: true,
      stencil: true,
      disableWebGL2Support: false,
      powerPreference: 'high-performance',
    })
    if (forceLow) engine.setHardwareScalingLevel(1.4)
    engineRef.current = engine

    const scene = new Scene(engine)
    scene.clearColor = new Color4(0, 0, 0, 0)
    sceneRef.current = scene

    const theme = THEMES[planetId] ?? THEMES['earth-like']
    const planetSeed = hashPlanetId(planetId)
    const isMobileViewport = engine.getRenderWidth() < 700
    const baseCameraRadius = isMobileViewport ? 8.8 : 7.2
    const camera = new ArcRotateCamera('planet-camera', Math.PI * 0.5, Math.PI * 0.48, baseCameraRadius, Vector3.Zero(), scene)
    camera.lowerRadiusLimit = isMobileViewport ? 8.2 : 6.8
    camera.upperRadiusLimit = isMobileViewport ? 10.4 : 8.8
    camera.wheelDeltaPercentage = 0
    camera.panningSensibility = 0
    camera.inputs.clear()

    const hemi = new HemisphericLight('hemi', new Vector3(0.25, 1, 0.1), scene)
    hemi.intensity = 0.62
    hemi.groundColor = Color3.FromHexString('#0b1223')
    hemi.diffuse = Color3.FromHexString(theme.cloud)

    const key = new DirectionalLight('key', new Vector3(-0.42, -0.62, -0.48), scene)
    key.intensity = 1.24
    key.diffuse = Color3.FromHexString('#ffffff')
    key.specular = Color3.FromHexString('#dbeafe')
    key.position = new Vector3(3.8, 4.1, 4.5)

    const fill = new PointLight('fill', new Vector3(-3.1, -2.4, 1.8), scene)
    fill.intensity = 0.34
    fill.diffuse = Color3.FromHexString(theme.cloud)

    const rim = new PointLight('rim', new Vector3(3.2, 2.8, -3.6), scene)
    rim.intensity = 0.38
    rim.diffuse = Color3.FromHexString(theme.ring)

    const planetPivot = new TransformNode('planet-pivot', scene)

    const planet = MeshBuilder.CreateSphere('planet', { diameter: 2.95, segments: forceLow ? 64 : 96 }, scene)
    planet.parent = planetPivot
    const planetMat = new PBRMaterial('planet-pbr', scene)
    planetMat.albedoTexture = makeAlbedo(scene, planetId, theme, planetSeed * 17)
    planetMat.bumpTexture = makeNormalLike(scene, planetSeed * 39)
    planetMat.metallic = planetId === 'black-hole' ? 0.42 : 0.06
    planetMat.roughness = planetId === 'ice-world' ? 0.28 : planetId === 'gas-giant' ? 0.58 : 0.5
    planetMat.clearCoat.isEnabled = true
    planetMat.clearCoat.intensity = planetId === 'gas-giant' ? 0.35 : 0.52
    planetMat.clearCoat.roughness = 0.35
    planetMat.environmentIntensity = 0.95
    planetMat.emissiveColor = Color3.FromHexString(theme.ring).scale(0.08)
    if (planetId === 'earth-like') {
      planetMat.emissiveTexture = makeCityLights(scene, planetSeed * 91)
      planetMat.emissiveColor = Color3.FromHexString('#ffd38b').scale(0.22)
    }
    planet.material = planetMat

    const clouds = MeshBuilder.CreateSphere('clouds', { diameter: 3.06, segments: forceLow ? 42 : 64 }, scene)
    clouds.parent = planetPivot
    const cloudMat = new StandardMaterial('cloud-mat', scene)
    cloudMat.diffuseColor = Color3.FromHexString(theme.cloud)
    cloudMat.alpha = planetId === 'black-hole' ? 0.05 : 0.18
    cloudMat.emissiveColor = Color3.FromHexString(theme.cloud).scale(0.15)
    cloudMat.emissiveFresnelParameters = new FresnelParameters()
    cloudMat.emissiveFresnelParameters.leftColor = Color3.FromHexString(theme.cloud).scale(0.35)
    cloudMat.emissiveFresnelParameters.rightColor = Color3.FromHexString('#000000')
    cloudMat.emissiveFresnelParameters.power = 2
    cloudMat.emissiveFresnelParameters.bias = 0.1
    clouds.material = cloudMat

    const atmo = MeshBuilder.CreateSphere('atmo', { diameter: 3.28, segments: forceLow ? 36 : 54 }, scene)
    atmo.parent = planetPivot
    const atmoMat = new StandardMaterial('atmo-mat', scene)
    atmoMat.diffuseColor = Color3.FromHexString(theme.ring)
    atmoMat.emissiveColor = Color3.FromHexString(theme.ring).scale(0.55)
    atmoMat.alpha = 0.14
    atmoMat.backFaceCulling = false
    atmoMat.emissiveFresnelParameters = new FresnelParameters()
    atmoMat.emissiveFresnelParameters.leftColor = Color3.FromHexString(theme.ring).scale(0.95)
    atmoMat.emissiveFresnelParameters.rightColor = Color3.FromHexString('#000000')
    atmoMat.emissiveFresnelParameters.power = 1.7
    atmoMat.emissiveFresnelParameters.bias = 0.2
    atmo.material = atmoMat

    const aura = MeshBuilder.CreateSphere('tap-aura', { diameter: 3.5, segments: 30 }, scene)
    aura.parent = planetPivot
    const auraMat = new StandardMaterial('tap-aura-mat', scene)
    auraMat.diffuseColor = Color3.FromHexString('#fde68a')
    auraMat.emissiveColor = Color3.FromHexString('#fde68a')
    auraMat.alpha = auraActive ? 0.14 : 0.05
    auraMat.backFaceCulling = false
    aura.material = auraMat

    // Orbit lines and satellites
    const satelliteNodes: TransformNode[] = []
    const orbitScale = isMobileViewport ? 0.82 : 1
    const orbitLayouts = PLANET_ORBIT_LAYOUTS[planetId] ?? PLANET_ORBIT_LAYOUTS['earth-like']
    const orbitProfiles: OrbitProfileMeta[] = ships.map((ship, index) => {
      const layout = orbitLayouts[index % orbitLayouts.length]
      return {
        ...layout,
        id: `${ship.id}-${index}`,
        radius: layout.radius * orbitScale,
        speed: layout.speed * (0.9 + Math.min(0.2, ship.level * 0.02)),
        phase: layout.phase + ship.level * 0.07,
      }
    })

    orbitProfiles.forEach((profile, index) => {
      const orbit = MeshBuilder.CreateTorus(
        `orbit-${profile.id}`,
        {
          diameter: profile.radius * 2,
          thickness: 0.01 + index * 0.002,
          tessellation: forceLow ? 88 : 140,
        },
        scene,
      )
      orbit.rotation.x = profile.tiltX
      orbit.rotation.y = profile.spinY
      const orbitMat = new StandardMaterial(`orbit-mat-${profile.id}`, scene)
      orbitMat.emissiveColor = Color3.FromHexString(theme.orbit).scale(0.75)
      orbitMat.alpha = 0.58
      orbit.material = orbitMat

      const sat = new TransformNode(`sat-${profile.id}-${index}`, scene)
      sat.rotationQuaternion = null
      createSatelliteModel(scene, sat, profile.variant, profile.id, theme, index)

      satelliteNodes.push(sat)
      sat.metadata = profile
    })

    // Static stars without twinkling
    const starCount = forceLow ? 110 : 220
    for (let i = 0; i < starCount; i += 1) {
      const phi = Math.acos(1 - 2 * ((i + 0.5) / starCount))
      const theta = Math.PI * (1 + Math.sqrt(5)) * i
      const radius = 9 + (i % 11) * 0.35
      const pos = new Vector3(
        Math.cos(theta) * Math.sin(phi) * radius,
        Math.cos(phi) * radius,
        Math.sin(theta) * Math.sin(phi) * radius,
      )
      const star = new TransformNode(`star-${i}`, scene)
      const node = MeshBuilder.CreateSphere(`star-body-${i}`, { diameter: 0.015 + ((i * 7) % 9) * 0.004, segments: 4 }, scene)
      node.parent = star
      const starMat = new StandardMaterial(`star-mat-${i}`, scene)
      starMat.emissiveColor = Color3.FromHexString(i % 5 === 0 ? '#fde68a' : '#dbeafe').scale(0.95)
      starMat.disableLighting = true
      node.material = starMat
      star.position.copyFrom(pos)
    }

    if (!forceLow) {
      const pipeline = new DefaultRenderingPipeline('planet-pipeline', true, scene, [camera])
      pipeline.samples = 1
      pipeline.fxaaEnabled = true
      pipeline.bloomEnabled = true
      pipeline.bloomThreshold = 0.67
      pipeline.bloomWeight = 0.55
      pipeline.bloomKernel = 52
      pipeline.imageProcessingEnabled = true
      pipeline.imageProcessing.contrast = 1.16
      pipeline.imageProcessing.exposure = 1.08
      pipeline.imageProcessing.vignetteEnabled = true
      pipeline.imageProcessing.vignetteWeight = 1.3
      pipeline.imageProcessing.vignetteStretch = 0.2
      pipeline.imageProcessing.vignetteColor = new Color4(0.01, 0.02, 0.08, 1)
    }

    scene.onBeforeRenderObservable.add(() => {
      const dt = engine.getDeltaTime() / 1000
      const t = performance.now() * 0.001
      const aspect = engine.getRenderWidth() / Math.max(1, engine.getRenderHeight())
      const targetRadius = baseCameraRadius + Math.max(0, (1.15 - aspect) * 1.7)
      camera.radius += (targetRadius - camera.radius) * 0.06
      const targetX = Date.now() - lastInputAtRef.current > 1400 ? Math.sin(t * 0.45) * 0.18 : pointerRef.current.x * 0.24
      const targetY = Date.now() - lastInputAtRef.current > 1400 ? Math.cos(t * 0.38) * 0.12 : pointerRef.current.y * 0.2
      camera.alpha += (Math.PI * 0.5 + targetX - camera.alpha) * 0.04
      camera.beta += (Math.PI * 0.48 + targetY - camera.beta) * 0.04

      const displacement = 1 - tapScaleRef.current
      const k = reducedMotion ? 13 : 22
      const c = reducedMotion ? 8 : 11
      tapVelocityRef.current += (displacement * k - tapVelocityRef.current * c) * dt
      tapScaleRef.current += tapVelocityRef.current * dt
      tapScaleRef.current = Math.max(0.95, Math.min(1.12, tapScaleRef.current))
      tapGlowRef.current = Math.max(0, tapGlowRef.current - dt * (reducedMotion ? 1.6 : 2.25))

      planetPivot.scaling.setAll(tapScaleRef.current)
      planet.rotation.y += dt * (reducedMotion ? 0.04 : 0.13)
      clouds.rotation.y += dt * (reducedMotion ? 0.07 : 0.22)
      atmo.rotation.y -= dt * 0.03
      planetMat.emissiveColor = Color3.FromHexString(theme.ring).scale(0.08 + tapGlowRef.current * 0.2)
      auraMat.alpha = (auraActive ? 0.14 : 0.05) + tapGlowRef.current * 0.12

      for (const sat of satelliteNodes) {
        const profile = sat.metadata as OrbitProfileMeta
        const radius = profile.radius
        const phase = profile.phase
        const speed = profile.speed
        const reverse = profile.reverse
        const tiltX = profile.tiltX
        const spinY = profile.spinY
        const dir = reverse ? -1 : 1
        const angle = t * speed * dir + phase
        const local = new Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
        const localTangent = new Vector3(-Math.sin(angle) * radius * dir, 0, Math.cos(angle) * radius * dir)
        const orbitMatrix = Matrix.RotationYawPitchRoll(spinY, tiltX, 0)
        const worldPos = Vector3.TransformCoordinates(local, orbitMatrix)
        const worldTan = Vector3.TransformNormal(localTangent, orbitMatrix).normalize()
        sat.position.copyFrom(worldPos)
        const flatTan = new Vector3(worldTan.x, 0, worldTan.z)
        if (flatTan.lengthSquared() < 0.000001) {
          flatTan.copyFromFloats(worldTan.x, 0, 1)
        } else {
          flatTan.normalize()
        }
        sat.rotation.y = Math.atan2(flatTan.x, flatTan.z)
        sat.rotation.x = 0
        sat.rotation.z = 0
      }
    })

    engine.runRenderLoop(() => scene.render())
    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      scene.dispose()
      engine.dispose()
      sceneRef.current = null
      engineRef.current = null
    }
  }, [auraActive, lastInputAtRef, planetId, pointerRef, qualityMode, reducedMotion, ships])

  return <canvas ref={canvasRef} className="planet-canvas" />
}

