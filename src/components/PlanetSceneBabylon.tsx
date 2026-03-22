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

function makeAlbedo(scene: Scene, theme: Theme, seed: number) {
  const texture = new DynamicTexture(`planet-albedo-${seed}`, { width: 1024, height: 512 }, scene, false)
  const ctx = texture.getContext()
  const g = ctx.createLinearGradient(0, 0, 1024, 0)
  g.addColorStop(0, theme.base)
  g.addColorStop(0.5, theme.secondary)
  g.addColorStop(1, theme.base)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 1024, 512)

  const rand = (n: number) => {
    const x = Math.sin(seed * 997 + n * 71) * 10000
    return x - Math.floor(x)
  }

  for (let i = 0; i < 36; i += 1) {
    const x = rand(i * 3 + 1) * 1024
    const y = rand(i * 3 + 2) * 512
    const r = 26 + rand(i * 3 + 3) * 110
    const blob = ctx.createRadialGradient(x, y, 0, x, y, r)
    blob.addColorStop(0, i % 2 === 0 ? '#ffffff33' : '#00000030')
    blob.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = blob
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  texture.update(false)
  return texture
}

function makeNormalLike(scene: Scene, seed: number) {
  const texture = new DynamicTexture(`planet-normal-${seed}`, { width: 512, height: 512 }, scene, false)
  const ctx = texture.getContext()
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
  const ctx = texture.getContext()
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
    const camera = new ArcRotateCamera('planet-camera', Math.PI * 0.5, Math.PI * 0.48, 6.8, Vector3.Zero(), scene)
    camera.lowerRadiusLimit = 6.4
    camera.upperRadiusLimit = 7.8
    camera.wheelDeltaPercentage = 0
    camera.panningSensibility = 0
    camera.inputs.clear()

    const hemi = new HemisphericLight('hemi', new Vector3(0.25, 1, 0.1), scene)
    hemi.intensity = 0.7
    hemi.groundColor = Color3.FromHexString('#0b1223')
    hemi.diffuse = Color3.FromHexString(theme.cloud)

    const key = new DirectionalLight('key', new Vector3(-0.42, -0.62, -0.48), scene)
    key.intensity = 1.65
    key.diffuse = Color3.FromHexString('#ffffff')
    key.specular = Color3.FromHexString('#f8fafc')
    key.position = new Vector3(3.8, 4.1, 4.5)

    const fill = new PointLight('fill', new Vector3(-3.1, -2.4, 1.8), scene)
    fill.intensity = 0.42
    fill.diffuse = Color3.FromHexString(theme.cloud)

    const rim = new PointLight('rim', new Vector3(3.2, 2.8, -3.6), scene)
    rim.intensity = 0.55
    rim.diffuse = Color3.FromHexString(theme.ring)

    const planetPivot = new TransformNode('planet-pivot', scene)

    const planet = MeshBuilder.CreateSphere('planet', { diameter: 2.95, segments: forceLow ? 64 : 96 }, scene)
    planet.parent = planetPivot
    const planetMat = new PBRMaterial('planet-pbr', scene)
    planetMat.albedoTexture = makeAlbedo(scene, theme, planetId.length * 17)
    planetMat.bumpTexture = makeNormalLike(scene, planetId.length * 39)
    planetMat.metallic = planetId === 'black-hole' ? 0.45 : 0.08
    planetMat.roughness = planetId === 'ice-world' ? 0.24 : 0.46
    planetMat.clearCoat.isEnabled = true
    planetMat.clearCoat.intensity = 0.85
    planetMat.clearCoat.roughness = 0.18
    planetMat.environmentIntensity = 1.2
    planetMat.emissiveColor = Color3.FromHexString(theme.ring).scale(0.08)
    if (planetId === 'earth-like') {
      planetMat.emissiveTexture = makeCityLights(scene, planetId.length * 91)
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
    ships.forEach((ship, index) => {
      const radius = 1.9 + index * 0.48
      const orbit = MeshBuilder.CreateTorus(
        `orbit-${ship.id}`,
        { diameter: radius * 2, thickness: 0.01 + index * 0.002, tessellation: forceLow ? 88 : 140 },
        scene,
      )
      orbit.rotation.x = 1.05 - index * 0.22
      orbit.rotation.y = index * 0.7
      const orbitMat = new StandardMaterial(`orbit-mat-${ship.id}`, scene)
      orbitMat.emissiveColor = Color3.FromHexString(theme.orbit).scale(0.75)
      orbitMat.alpha = 0.58
      orbit.material = orbitMat

      const sat = new TransformNode(`sat-${ship.id}`, scene)
      const body = MeshBuilder.CreateBox(`sat-body-${ship.id}`, { width: 0.16, height: 0.07, depth: 0.13 }, scene)
      body.parent = sat
      const bodyMat = new PBRMaterial(`sat-body-mat-${ship.id}`, scene)
      bodyMat.albedoColor = Color3.FromHexString(index === 1 ? '#dbeafe' : '#cbd5e1')
      bodyMat.metallic = 0.92
      bodyMat.roughness = 0.2
      body.material = bodyMat

      const engineFlame = MeshBuilder.CreateCylinder(
        `sat-flame-${ship.id}`,
        { diameterTop: 0.015, diameterBottom: 0.06, height: 0.28, tessellation: 10 },
        scene,
      )
      engineFlame.parent = sat
      engineFlame.position.z = -0.16
      engineFlame.rotation.x = Math.PI * 0.5
      const flameMat = new StandardMaterial(`sat-flame-mat-${ship.id}`, scene)
      flameMat.emissiveColor = Color3.FromHexString(index === 2 ? '#f97316' : '#22d3ee')
      flameMat.alpha = 0.72
      flameMat.disableLighting = true
      engineFlame.material = flameMat

      satelliteNodes.push(sat)
      sat.metadata = { radius, phase: index * 1.85, speed: 0.4 + index * 0.12, reverse: index === 2 }
    })

    // Comets for living space feel
    const cometNodes: TransformNode[] = []
    ;[
      { y: 1.5, z: -2.6, speed: 0.82, phase: 0.2, color: '#dbeafe' },
      { y: -1.25, z: -2.2, speed: 0.64, phase: 1.8, color: '#fde68a' },
    ].forEach((def, i) => {
      const comet = new TransformNode(`comet-${i}`, scene)
      const head = MeshBuilder.CreateSphere(`comet-head-${i}`, { diameter: 0.08, segments: 12 }, scene)
      head.parent = comet
      const headMat = new StandardMaterial(`comet-head-mat-${i}`, scene)
      headMat.emissiveColor = Color3.FromHexString(def.color)
      headMat.disableLighting = true
      head.material = headMat

      const tail = MeshBuilder.CreateCylinder(`comet-tail-${i}`, { diameterTop: 0.02, diameterBottom: 0.09, height: 0.64, tessellation: 10 }, scene)
      tail.parent = comet
      tail.position.x = -0.3
      tail.rotation.z = Math.PI * 0.5
      const tailMat = new StandardMaterial(`comet-tail-mat-${i}`, scene)
      tailMat.emissiveColor = Color3.FromHexString(def.color).scale(0.75)
      tailMat.alpha = 0.44
      tailMat.disableLighting = true
      tail.material = tailMat

      comet.metadata = def
      cometNodes.push(comet)
    })

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
        const radius: number = sat.metadata.radius
        const phase: number = sat.metadata.phase
        const speed: number = sat.metadata.speed
        const reverse: boolean = sat.metadata.reverse
        const angle = t * speed * (reverse ? -1 : 1) + phase
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        sat.position.set(x, 0, z)
        sat.rotation.y = Math.atan2(Math.cos(angle), -Math.sin(angle))
      }

      for (const comet of cometNodes) {
        const speed: number = comet.metadata.speed
        const phase: number = comet.metadata.phase
        const y: number = comet.metadata.y
        const z: number = comet.metadata.z
        const x = ((t * speed + phase) % 12) - 6
        comet.position.set(x, y + Math.sin(t * 0.9 + phase) * 0.12, z)
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

