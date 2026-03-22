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

type ShipVariant = 'interceptor' | 'carrier' | 'explorer'

type ShipOrbitLayout = {
  radius: number
  tiltX: number
  spinY: number
  speed: number
  phase: number
  reverse: boolean
}

type MoonLayout = {
  radius: number
  size: number
  tiltX: number
  spinY: number
  speed: number
  phase: number
  base: string
  secondary: string
  roughness: number
  metallic: number
  hasRing?: boolean
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

const SHIP_ORBIT_LAYOUTS: ShipOrbitLayout[] = [
  { radius: 2.18, tiltX: 1.05, spinY: 0.22, speed: 0.5, phase: 0.25, reverse: false },
  { radius: 2.68, tiltX: 0.78, spinY: 0.96, speed: 0.6, phase: 2.35, reverse: false },
  { radius: 3.08, tiltX: 1.22, spinY: 1.74, speed: 0.44, phase: 4.3, reverse: true },
]

const PLANET_MOON_LAYOUTS: Record<string, MoonLayout[]> = {
  'earth-like': [
    { radius: 3.55, size: 0.21, tiltX: 0.9, spinY: 0.42, speed: 0.16, phase: 0.25, base: '#cbd5e1', secondary: '#64748b', roughness: 0.86, metallic: 0.08 },
    { radius: 4.08, size: 0.14, tiltX: 1.21, spinY: 1.2, speed: 0.13, phase: 2.3, base: '#fde68a', secondary: '#92400e', roughness: 0.7, metallic: 0.12 },
  ],
  'gas-giant': [
    { radius: 3.75, size: 0.24, tiltX: 1.08, spinY: 0.3, speed: 0.12, phase: 0.8, base: '#f59e0b', secondary: '#78350f', roughness: 0.62, metallic: 0.16, hasRing: true },
    { radius: 4.35, size: 0.18, tiltX: 0.68, spinY: 1.52, speed: 0.1, phase: 3.2, base: '#fdba74', secondary: '#9a3412', roughness: 0.66, metallic: 0.12 },
  ],
  nebula: [
    { radius: 3.62, size: 0.2, tiltX: 1.22, spinY: 0.55, speed: 0.15, phase: 1.3, base: '#a78bfa', secondary: '#5b21b6', roughness: 0.52, metallic: 0.2 },
    { radius: 4.26, size: 0.16, tiltX: 0.82, spinY: 1.86, speed: 0.12, phase: 4.1, base: '#67e8f9', secondary: '#0e7490', roughness: 0.6, metallic: 0.14, hasRing: true },
  ],
  'black-hole': [
    { radius: 3.48, size: 0.19, tiltX: 1.28, spinY: 0.22, speed: 0.2, phase: 0.6, base: '#1f2937', secondary: '#111827', roughness: 0.82, metallic: 0.06 },
    { radius: 3.98, size: 0.13, tiltX: 0.9, spinY: 1.05, speed: 0.17, phase: 2.8, base: '#f97316', secondary: '#7c2d12', roughness: 0.58, metallic: 0.2 },
    { radius: 4.42, size: 0.11, tiltX: 1.4, spinY: 2.26, speed: 0.15, phase: 4.7, base: '#facc15', secondary: '#92400e', roughness: 0.56, metallic: 0.18 },
  ],
  'ice-world': [
    { radius: 3.52, size: 0.2, tiltX: 0.72, spinY: 0.38, speed: 0.14, phase: 1.1, base: '#dbeafe', secondary: '#93c5fd', roughness: 0.78, metallic: 0.09 },
    { radius: 4.1, size: 0.15, tiltX: 1.24, spinY: 1.55, speed: 0.11, phase: 3.4, base: '#a5f3fc', secondary: '#0ea5e9', roughness: 0.69, metallic: 0.14, hasRing: true },
  ],
  'ancient-ruins': [
    { radius: 3.58, size: 0.22, tiltX: 1.02, spinY: 0.27, speed: 0.13, phase: 0.2, base: '#d6d3d1', secondary: '#57534e', roughness: 0.88, metallic: 0.06 },
    { radius: 4.18, size: 0.17, tiltX: 0.74, spinY: 1.35, speed: 0.1, phase: 2.6, base: '#84cc16', secondary: '#14532d', roughness: 0.66, metallic: 0.1 },
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

  // Fine grain adds geological structure and avoids flat color fields.
  for (let i = 0; i < 1800; i += 1) {
    const x = rand(i + 901) * 1024
    const y = rand(i + 1211) * 512
    const shade = rand(i + 1447) > 0.5 ? 255 : 0
    const alpha = 0.025 + rand(i + 1663) * 0.05
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha.toFixed(3)})`
    ctx.fillRect(x, y, 1.6, 1.6)
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
    for (let i = 0; i < 8; i += 1) {
      ctx.strokeStyle = '#92400e66'
      ctx.lineWidth = 3 + rand(i + 1880) * 4
      ctx.beginPath()
      ctx.moveTo(rand(i + 1921) * 1024, rand(i + 1977) * 512)
      ctx.lineTo(rand(i + 2011) * 1024, rand(i + 2059) * 512)
      ctx.stroke()
    }
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
    for (let i = 0; i < 6; i += 1) {
      const cy = rand(i + 2117) * 512
      const band = ctx.createLinearGradient(0, cy - 20, 1024, cy + 20)
      band.addColorStop(0, 'rgba(255,237,213,0)')
      band.addColorStop(0.5, 'rgba(255,237,213,0.25)')
      band.addColorStop(1, 'rgba(255,237,213,0)')
      ctx.fillStyle = band
      ctx.fillRect(0, cy - 14, 1024, 28)
    }
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
    for (let i = 0; i < 14; i += 1) {
      const x = rand(i + 2191) * 1024
      const y = rand(i + 2249) * 512
      const dust = ctx.createRadialGradient(x, y, 0, x, y, 40 + rand(i + 2301) * 60)
      dust.addColorStop(0, i % 2 === 0 ? '#d8b4fe66' : '#67e8f955')
      dust.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = dust
      ctx.beginPath()
      ctx.arc(x, y, 32 + rand(i + 2347) * 55, 0, Math.PI * 2)
      ctx.fill()
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
    for (let i = 0; i < 7; i += 1) {
      const arcR = 120 + i * 24
      ctx.strokeStyle = i % 2 === 0 ? '#f59e0b66' : '#fb923c44'
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.ellipse(512, 256, arcR, arcR * 0.35, 0.5, 0.3 + i * 0.2, 2.2 + i * 0.22)
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
    for (let i = 0; i < 11; i += 1) {
      const x = rand(i + 2411) * 1024
      const y = rand(i + 2453) * 512
      const glacier = ctx.createRadialGradient(x, y, 0, x, y, 45 + rand(i + 2519) * 95)
      glacier.addColorStop(0, '#ecfeff99')
      glacier.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glacier
      ctx.beginPath()
      ctx.ellipse(x, y, 60 + rand(i + 2579) * 80, 22 + rand(i + 2621) * 38, rand(i + 2663), 0, Math.PI * 2)
      ctx.fill()
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
    for (let i = 0; i < 9; i += 1) {
      const y = rand(i + 2701) * 512
      ctx.strokeStyle = '#7c2d1266'
      ctx.lineWidth = 6 + rand(i + 2753) * 4
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(1024, y + (rand(i + 2797) - 0.5) * 34)
      ctx.stroke()
    }
  }

  texture.update(false)
  return texture
}

function makeNormalLike(scene: Scene, planetId: string, seed: number) {
  const texture = new DynamicTexture(`planet-normal-${seed}`, { width: 512, height: 512 }, scene, false)
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D
  const rand = (n: number) => {
    const x = Math.sin(seed * 131 + n * 53) * 10000
    return x - Math.floor(x)
  }
  ctx.fillStyle = '#7f7fff'
  ctx.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 220; i += 1) {
    const x = rand(i + 1) * 512
    const y = rand(i + 2) * 512
    const r = 6 + rand(i + 3) * 20
    const alpha = 0.08 + rand(i + 4) * 0.12
    ctx.fillStyle = `rgba(127,127,255,${alpha.toFixed(3)})`
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  if (planetId === 'gas-giant') {
    for (let y = 0; y < 512; y += 16) {
      const lift = 0.08 + Math.sin(y * 0.05 + seed * 0.002) * 0.05
      ctx.fillStyle = `rgba(155,155,255,${lift.toFixed(3)})`
      ctx.fillRect(0, y, 512, 10)
    }
  } else if (planetId === 'ice-world') {
    for (let i = 0; i < 26; i += 1) {
      ctx.strokeStyle = `rgba(172,172,255,${(0.1 + rand(i + 301) * 0.11).toFixed(3)})`
      ctx.lineWidth = 1.5 + rand(i + 325) * 2.4
      ctx.beginPath()
      const x = rand(i + 349) * 512
      const y = rand(i + 377) * 512
      ctx.moveTo(x, y)
      ctx.lineTo(x + (rand(i + 401) - 0.5) * 180, y + (rand(i + 439) - 0.5) * 120)
      ctx.stroke()
    }
  } else if (planetId === 'ancient-ruins') {
    for (let i = 0; i < 18; i += 1) {
      const x = rand(i + 463) * 512
      const y = rand(i + 491) * 512
      const r = 10 + rand(i + 521) * 24
      ctx.strokeStyle = `rgba(98,98,255,${(0.12 + rand(i + 547) * 0.1).toFixed(3)})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else if (planetId === 'earth-like') {
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = `rgba(150,150,255,${(0.06 + rand(i + 571) * 0.08).toFixed(3)})`
      ctx.beginPath()
      ctx.ellipse(rand(i + 601) * 512, rand(i + 631) * 512, 30 + rand(i + 659) * 70, 8 + rand(i + 683) * 24, rand(i + 709), 0, Math.PI * 2)
      ctx.fill()
    }
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

function makeDetailOverlay(scene: Scene, planetId: string, seed: number) {
  const texture = new DynamicTexture(`planet-detail-${planetId}-${seed}`, { width: 1024, height: 512 }, scene, false)
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D
  ctx.clearRect(0, 0, 1024, 512)
  const rand = (n: number) => {
    const x = Math.sin(seed * 727 + n * 41) * 10000
    return x - Math.floor(x)
  }

  if (planetId === 'earth-like') {
    for (let i = 0; i < 18; i += 1) {
      const x = rand(i + 1) * 1024
      const y = rand(i + 21) * 512
      ctx.fillStyle = i % 2 === 0 ? '#16a34a66' : '#16653455'
      ctx.beginPath()
      ctx.ellipse(x, y, 90 + rand(i + 41) * 120, 20 + rand(i + 59) * 40, rand(i + 73) * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (planetId === 'gas-giant') {
    for (let y = 0; y < 512; y += 13) {
      const alpha = 0.14 + Math.sin(y * 0.08 + seed * 0.0003) * 0.08
      ctx.fillStyle = `rgba(254,215,170,${Math.max(0.03, alpha).toFixed(3)})`
      ctx.fillRect(0, y, 1024, 8)
    }
    const eye = ctx.createRadialGradient(730, 260, 8, 730, 260, 85)
    eye.addColorStop(0, '#fff7edcc')
    eye.addColorStop(0.5, '#fb923c88')
    eye.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = eye
    ctx.beginPath()
    ctx.ellipse(730, 260, 120, 70, 0.21, 0, Math.PI * 2)
    ctx.fill()
  } else if (planetId === 'nebula') {
    for (let i = 0; i < 20; i += 1) {
      ctx.strokeStyle = i % 2 === 0 ? '#a78bfa66' : '#67e8f955'
      ctx.lineWidth = 2 + rand(i + 101) * 5
      ctx.beginPath()
      ctx.moveTo(rand(i + 123) * 1024, rand(i + 149) * 512)
      ctx.bezierCurveTo(
        rand(i + 173) * 1024,
        rand(i + 197) * 512,
        rand(i + 223) * 1024,
        rand(i + 241) * 512,
        rand(i + 269) * 1024,
        rand(i + 293) * 512,
      )
      ctx.stroke()
    }
  } else if (planetId === 'black-hole') {
    for (let i = 0; i < 10; i += 1) {
      ctx.strokeStyle = i % 2 === 0 ? '#f59e0b88' : '#fb923c66'
      ctx.lineWidth = 2.2 + rand(i + 307) * 2.6
      ctx.beginPath()
      const r = 120 + i * 24
      ctx.ellipse(512, 256, r, r * 0.33, 0.42, 0.3 + i * 0.18, 2.05 + i * 0.22)
      ctx.stroke()
    }
  } else if (planetId === 'ice-world') {
    for (let i = 0; i < 26; i += 1) {
      ctx.strokeStyle = i % 2 === 0 ? '#e0f2fe88' : '#bae6fd66'
      ctx.lineWidth = 1.5 + rand(i + 401) * 3.4
      ctx.beginPath()
      const x = rand(i + 427) * 1024
      const y = rand(i + 449) * 512
      ctx.moveTo(x, y)
      ctx.lineTo(x + (rand(i + 479) - 0.5) * 260, y + (rand(i + 503) - 0.5) * 170)
      ctx.stroke()
    }
  } else if (planetId === 'ancient-ruins') {
    for (let i = 0; i < 14; i += 1) {
      const x = rand(i + 541) * 1024
      const y = rand(i + 563) * 512
      const r = 16 + rand(i + 587) * 48
      ctx.strokeStyle = '#b4530977'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  texture.update(false)
  return texture
}

type OrbitProfileMeta = ShipOrbitLayout & {
  id: string
  variant: ShipVariant
}

type ExhaustNodeFx = {
  node: TransformNode
  material: StandardMaterial
  baseLength: number
  baseWidth: number
  baseAlpha: number
  baseX: number
  baseZ: number
  pulse: number
  decay: number
}

type ShipExhaustFx = {
  core: ExhaustNodeFx[]
  plume: ExhaustNodeFx[]
}

type MoonProfileMeta = MoonLayout & {
  id: string
}

type ShipNodeMeta = {
  profile: OrbitProfileMeta
  exhaust: ShipExhaustFx
}

function makeMoonAlbedo(scene: Scene, seed: number, base: string, secondary: string) {
  const texture = new DynamicTexture(`moon-albedo-${seed}`, { width: 512, height: 256 }, scene, false)
  const ctx = texture.getContext() as unknown as CanvasRenderingContext2D
  const g = ctx.createLinearGradient(0, 0, 512, 256)
  g.addColorStop(0, base)
  g.addColorStop(1, secondary)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 256)
  const rand = (n: number) => {
    const x = Math.sin(seed * 613 + n * 37) * 10000
    return x - Math.floor(x)
  }
  for (let i = 0; i < 20; i += 1) {
    const x = rand(i + 1) * 512
    const y = rand(i + 11) * 256
    const r = 8 + rand(i + 23) * 26
    const blob = ctx.createRadialGradient(x, y, 0, x, y, r)
    blob.addColorStop(0, '#ffffff33')
    blob.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = blob
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  texture.update(false)
  return texture
}

function createShipModel(
  scene: Scene,
  shipVisual: TransformNode,
  variant: ShipVariant,
  id: string,
  shipIndex: number,
): ShipExhaustFx {
  const accent =
    variant === 'interceptor' ? '#22d3ee' : variant === 'carrier' ? '#f97316' : '#a78bfa'
  const hullMat = new PBRMaterial(`ship-hull-mat-${id}`, scene)
  hullMat.albedoColor =
    variant === 'carrier'
      ? Color3.FromHexString('#94a3b8')
      : variant === 'explorer'
        ? Color3.FromHexString('#cbd5e1')
        : Color3.FromHexString('#e2e8f0')
  hullMat.metallic = 0.99
  hullMat.roughness = variant === 'carrier' ? 0.14 : 0.1
  hullMat.clearCoat.isEnabled = true
  hullMat.clearCoat.intensity = 0.86
  hullMat.clearCoat.roughness = 0.07
  hullMat.environmentIntensity = 1.24

  const darkHullMat = new PBRMaterial(`ship-dark-mat-${id}`, scene)
  darkHullMat.albedoColor = Color3.FromHexString('#1e293b')
  darkHullMat.metallic = 0.92
  darkHullMat.roughness = 0.14
  darkHullMat.environmentIntensity = 1.05

  const wingMat = new PBRMaterial(`ship-wing-mat-${id}`, scene)
  wingMat.albedoColor = Color3.FromHexString('#e5e7eb')
  wingMat.metallic = 0.97
  wingMat.roughness = 0.11
  wingMat.clearCoat.isEnabled = true
  wingMat.clearCoat.intensity = 0.62
  wingMat.clearCoat.roughness = 0.1
  wingMat.environmentIntensity = 1.1

  const fuselage = MeshBuilder.CreateCylinder(
    `ship-fuselage-${id}`,
    {
      height: variant === 'carrier' ? 0.42 : variant === 'explorer' ? 0.34 : 0.3,
      diameterTop: variant === 'interceptor' ? 0.046 : 0.058,
      diameterBottom: variant === 'carrier' ? 0.11 : 0.09,
      tessellation: 18,
    },
    scene,
  )
  fuselage.parent = shipVisual
  fuselage.rotation.x = Math.PI * 0.5
  fuselage.material = hullMat

  const nose = MeshBuilder.CreateSphere(`ship-nose-${id}`, { diameter: 0.09, segments: 12 }, scene)
  nose.parent = shipVisual
  nose.position.z = variant === 'carrier' ? 0.2 : 0.18
  nose.scaling.set(variant === 'interceptor' ? 0.66 : 0.74, 0.62, variant === 'interceptor' ? 1.45 : 1.25)
  nose.material = hullMat

  const cabin = MeshBuilder.CreateBox(
    `ship-cabin-${id}`,
    {
      width: variant === 'carrier' ? 0.145 : 0.105,
      height: variant === 'interceptor' ? 0.048 : 0.06,
      depth: variant === 'carrier' ? 0.13 : 0.11,
    },
    scene,
  )
  cabin.parent = shipVisual
  cabin.position.y = variant === 'interceptor' ? 0.044 : 0.054
  cabin.position.z = 0.03
  cabin.material = darkHullMat

  const wingSpan = variant === 'carrier' ? 0.23 : variant === 'explorer' ? 0.18 : 0.16
  const wingSweep = variant === 'interceptor' ? 0.24 : variant === 'explorer' ? 0.13 : 0.08
  const wingDepth = variant === 'carrier' ? 0.18 : variant === 'explorer' ? 0.12 : 0.1
  const wingL = MeshBuilder.CreateBox(`ship-wing-l-${id}`, { width: wingSpan, height: 0.01, depth: wingDepth }, scene)
  wingL.parent = shipVisual
  wingL.position.x = -0.12
  wingL.position.z = -0.01
  wingL.rotation.z = wingSweep
  wingL.material = wingMat
  const wingR = wingL.clone(`ship-wing-r-${id}`)
  wingR.parent = shipVisual
  wingR.position.x = 0.12
  wingR.rotation.z = -wingSweep

  const tailFin = MeshBuilder.CreateBox(`ship-tail-fin-${id}`, { width: 0.016, height: 0.09, depth: 0.06 }, scene)
  tailFin.parent = shipVisual
  tailFin.position.y = 0.06
  tailFin.position.z = -0.11
  tailFin.material = wingMat

  const elevL = MeshBuilder.CreateBox(`ship-tail-l-${id}`, { width: 0.07, height: 0.01, depth: 0.05 }, scene)
  elevL.parent = shipVisual
  elevL.position.x = -0.06
  elevL.position.z = -0.12
  elevL.rotation.z = 0.08
  elevL.material = wingMat
  const elevR = elevL.clone(`ship-tail-r-${id}`)
  elevR.parent = shipVisual
  elevR.position.x = 0.06
  elevR.rotation.z = -0.08

  if (variant === 'carrier') {
    const bay = MeshBuilder.CreateBox(`ship-bay-${id}`, { width: 0.12, height: 0.05, depth: 0.09 }, scene)
    bay.parent = shipVisual
    bay.position.y = -0.045
    bay.position.z = -0.02
    bay.material = darkHullMat
    const podL = MeshBuilder.CreateCylinder(
      `ship-pod-l-${id}`,
      { height: 0.17, diameterTop: 0.05, diameterBottom: 0.06, tessellation: 12 },
      scene,
    )
    podL.parent = shipVisual
    podL.rotation.x = Math.PI * 0.5
    podL.position.x = -0.16
    podL.position.z = -0.01
    podL.material = hullMat
    const podR = podL.clone(`ship-pod-r-${id}`)
    podR.parent = shipVisual
    podR.position.x = 0.16
  } else if (variant === 'explorer') {
    const sensor = MeshBuilder.CreateTorus(`ship-sensor-${id}`, { diameter: 0.09, thickness: 0.009, tessellation: 30 }, scene)
    sensor.parent = shipVisual
    sensor.position.z = 0.09
    sensor.rotation.x = Math.PI * 0.5
    const sensorMat = new StandardMaterial(`ship-sensor-mat-${id}`, scene)
    sensorMat.emissiveColor = Color3.FromHexString('#67e8f9').scale(0.7)
    sensorMat.alpha = 0.86
    sensor.material = sensorMat
    const spine = MeshBuilder.CreateBox(`ship-spine-${id}`, { width: 0.028, height: 0.07, depth: 0.18 }, scene)
    spine.parent = shipVisual
    spine.position.y = 0.055
    spine.position.z = 0.01
    spine.material = darkHullMat
  } else {
    const cannon = MeshBuilder.CreateCylinder(
      `ship-cannon-${id}`,
      { height: 0.15, diameterTop: 0.01, diameterBottom: 0.02, tessellation: 10 },
      scene,
    )
    cannon.parent = shipVisual
    cannon.rotation.x = Math.PI * 0.5
    cannon.position.y = 0.03
    cannon.position.z = 0.19
    cannon.material = darkHullMat
  }

  const cockpit = MeshBuilder.CreateSphere(`ship-cockpit-${id}`, { diameter: 0.05, segments: 12 }, scene)
  cockpit.parent = shipVisual
  cockpit.position.set(0, 0.06, 0.12)
  cockpit.scaling.set(0.72, 0.62, 1.12)
  const cockpitMat = new StandardMaterial(`ship-cockpit-mat-${id}`, scene)
  cockpitMat.emissiveColor = Color3.FromHexString(shipIndex % 2 === 0 ? '#7dd3fc' : '#fbbf24').scale(0.72)
  cockpitMat.alpha = 0.86
  cockpit.material = cockpitMat

  const accentStrip = MeshBuilder.CreateBox(
    `ship-accent-${id}`,
    { width: 0.028, height: 0.012, depth: variant === 'carrier' ? 0.18 : 0.14 },
    scene,
  )
  accentStrip.parent = shipVisual
  accentStrip.position.y = 0.022
  accentStrip.position.z = variant === 'carrier' ? -0.01 : 0.01
  const accentMat = new StandardMaterial(`ship-accent-mat-${id}`, scene)
  accentMat.emissiveColor = Color3.FromHexString(accent).scale(0.88)
  accentMat.disableLighting = true
  accentMat.alpha = 0.82
  accentStrip.material = accentMat

  const enginePositions = variant === 'carrier' ? [-0.07, 0, 0.07] : [-0.04, 0.04]
  const exhaustCore: ExhaustNodeFx[] = []
  const exhaustPlume: ExhaustNodeFx[] = []
  enginePositions.forEach((xPos, idx) => {
    const nozzle = MeshBuilder.CreateCylinder(
      `ship-nozzle-${id}-${idx}`,
      { diameterTop: 0.025, diameterBottom: 0.03, height: 0.04, tessellation: 10 },
      scene,
    )
    nozzle.parent = shipVisual
    nozzle.position.x = xPos
    nozzle.position.z = -0.15
    nozzle.rotation.x = Math.PI * 0.5
    nozzle.material = darkHullMat

    const flame = MeshBuilder.CreateCylinder(
      `ship-flame-${id}-${idx}`,
      { diameterTop: 0.008, diameterBottom: 0.03, height: 0.2, tessellation: 10 },
      scene,
    )
    flame.parent = shipVisual
    flame.position.x = xPos
    flame.position.z = -0.24
    flame.rotation.x = Math.PI * 0.5
    const flameMat = new StandardMaterial(`ship-flame-mat-${id}-${idx}`, scene)
    flameMat.emissiveColor = Color3.FromHexString('#ff3b1f').scale(1.05)
    flameMat.alpha = 0.82
    flameMat.disableLighting = true
    flame.material = flameMat
    exhaustCore.push({
      node: flame,
      material: flameMat,
      baseLength: 1,
      baseWidth: 1,
      baseAlpha: 0.82,
      baseX: xPos,
      baseZ: -0.24,
      pulse: 10 + idx * 1.6,
      decay: 1,
    })

    ;[
      { z: -0.3, len: 0.17, wTop: 0.015, wBottom: 0.042, alpha: 0.46, decay: 1 },
      { z: -0.37, len: 0.21, wTop: 0.024, wBottom: 0.06, alpha: 0.24, decay: 0.62 },
      { z: -0.45, len: 0.26, wTop: 0.038, wBottom: 0.09, alpha: 0.11, decay: 0.36 },
    ].forEach((seg, segIndex) => {
      const plume = MeshBuilder.CreateCylinder(
        `ship-plume-${id}-${idx}-${segIndex}`,
        { diameterTop: seg.wTop, diameterBottom: seg.wBottom, height: seg.len, tessellation: 10 },
        scene,
      )
      plume.parent = shipVisual
      plume.position.x = xPos
      plume.position.z = seg.z
      plume.rotation.x = Math.PI * 0.5
      const plumeMat = new StandardMaterial(`ship-plume-mat-${id}-${idx}-${segIndex}`, scene)
      plumeMat.emissiveColor = Color3.FromHexString('#ff4a1f').scale(1 - segIndex * 0.32)
      plumeMat.alpha = seg.alpha
      plumeMat.disableLighting = true
      plume.material = plumeMat
      exhaustPlume.push({
        node: plume,
        material: plumeMat,
        baseLength: 1,
        baseWidth: 1,
        baseAlpha: seg.alpha,
        baseX: xPos,
        baseZ: seg.z,
        pulse: 6 + idx * 1.2 + segIndex * 0.85,
        decay: seg.decay,
      })
    })
  })

  return { core: exhaustCore, plume: exhaustPlume }
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
    planetMat.bumpTexture = makeNormalLike(scene, planetId, planetSeed * 39)
    planetMat.metallic = planetId === 'black-hole' ? 0.18 : 0.03
    planetMat.roughness =
      planetId === 'ice-world'
        ? 0.36
        : planetId === 'gas-giant'
          ? 0.66
          : planetId === 'ancient-ruins'
            ? 0.72
            : planetId === 'earth-like'
              ? 0.56
              : 0.52
    planetMat.clearCoat.isEnabled = true
    planetMat.clearCoat.intensity = planetId === 'gas-giant' ? 0.22 : planetId === 'ice-world' ? 0.64 : 0.48
    planetMat.clearCoat.roughness = planetId === 'ice-world' ? 0.18 : 0.32
    planetMat.environmentIntensity = planetId === 'black-hole' ? 0.62 : 1.02
    planetMat.emissiveColor = Color3.FromHexString(theme.ring).scale(0.08)
    if (planetId === 'earth-like') {
      planetMat.emissiveTexture = makeCityLights(scene, planetSeed * 91)
      planetMat.emissiveColor = Color3.FromHexString('#ffd38b').scale(0.22)
    }
    planet.material = planetMat

    const detailLayer = MeshBuilder.CreateSphere(
      'planet-detail',
      { diameter: 3.005, segments: forceLow ? 44 : 72 },
      scene,
    )
    detailLayer.parent = planetPivot
    const detailMat = new StandardMaterial('planet-detail-mat', scene)
    detailMat.diffuseTexture = makeDetailOverlay(scene, planetId, planetSeed * 57)
    detailMat.emissiveTexture = detailMat.diffuseTexture
    detailMat.emissiveColor = Color3.FromHexString(theme.cloud).scale(planetId === 'black-hole' ? 0.42 : 0.22)
    detailMat.alpha = planetId === 'gas-giant' ? 0.5 : planetId === 'ice-world' ? 0.58 : 0.46
    detailMat.backFaceCulling = false
    detailLayer.material = detailMat

    if (planetId === 'gas-giant') {
      const gasRing = MeshBuilder.CreateTorus(
        'planet-gas-ring',
        { diameter: 4.6, thickness: 0.08, tessellation: forceLow ? 56 : 88 },
        scene,
      )
      gasRing.parent = planetPivot
      gasRing.rotation.x = Math.PI * 0.52
      const gasRingMat = new StandardMaterial('planet-gas-ring-mat', scene)
      gasRingMat.emissiveColor = Color3.FromHexString('#fbbf24').scale(0.42)
      gasRingMat.alpha = 0.45
      gasRing.material = gasRingMat
    } else if (planetId === 'ice-world') {
      const iceArc = MeshBuilder.CreateTorus(
        'planet-ice-arc',
        { diameter: 3.8, thickness: 0.025, tessellation: forceLow ? 44 : 72 },
        scene,
      )
      iceArc.parent = planetPivot
      iceArc.rotation.x = Math.PI * 0.32
      iceArc.rotation.y = Math.PI * 0.22
      const iceArcMat = new StandardMaterial('planet-ice-arc-mat', scene)
      iceArcMat.emissiveColor = Color3.FromHexString('#bae6fd').scale(0.48)
      iceArcMat.alpha = 0.36
      iceArc.material = iceArcMat
    } else if (planetId === 'ancient-ruins') {
      for (let i = 0; i < 6; i += 1) {
        const theta = (i / 6) * Math.PI * 2 + (planetSeed % 17) * 0.11
        const spire = MeshBuilder.CreateCylinder(
          `planet-spire-${i}`,
          { height: 0.24 + (i % 3) * 0.04, diameterTop: 0.01, diameterBottom: 0.05, tessellation: 8 },
          scene,
        )
        spire.parent = planetPivot
        spire.position.set(Math.cos(theta) * 1.34, Math.sin(theta * 0.6) * 0.52, Math.sin(theta) * 1.34)
        spire.lookAt(Vector3.Zero())
        const spireMat = new StandardMaterial(`planet-spire-mat-${i}`, scene)
        spireMat.diffuseColor = Color3.FromHexString('#d97706')
        spireMat.emissiveColor = Color3.FromHexString('#451a03').scale(0.35)
        spire.material = spireMat
      }
    }

    const clouds = MeshBuilder.CreateSphere('clouds', { diameter: 3.06, segments: forceLow ? 42 : 64 }, scene)
    clouds.parent = planetPivot
    const cloudMat = new StandardMaterial('cloud-mat', scene)
    cloudMat.diffuseColor = Color3.FromHexString(theme.cloud)
    cloudMat.alpha = planetId === 'black-hole' ? 0.03 : planetId === 'gas-giant' ? 0.22 : planetId === 'earth-like' ? 0.19 : 0.16
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

    // Ships orbit around planets and are shared across all planets.
    const shipNodes: TransformNode[] = []
    const moonNodes: TransformNode[] = []
    const orbitScale = isMobileViewport ? 0.82 : 1
    const shipVariants: ShipVariant[] = ['interceptor', 'carrier', 'explorer']
    const orbitProfiles: OrbitProfileMeta[] = ships.map((ship, index) => {
      const layout = SHIP_ORBIT_LAYOUTS[index % SHIP_ORBIT_LAYOUTS.length]
      return {
        ...layout,
        id: `${ship.id}-${index}`,
        variant: shipVariants[index % shipVariants.length],
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

      const shipNode = new TransformNode(`ship-${profile.id}-${index}`, scene)
      shipNode.rotationQuaternion = null
      const shipVisual = new TransformNode(`ship-visual-${profile.id}-${index}`, scene)
      shipVisual.parent = shipNode
      // Shift geometry forward so orbit line does not cross through hull center.
      shipVisual.position.z = 0.11
      const exhaust = createShipModel(scene, shipVisual, profile.variant, profile.id, index)

      shipNodes.push(shipNode)
      shipNode.metadata = { profile, exhaust } satisfies ShipNodeMeta
    })

    // Per-planet moons: unique size, color, texture and orbital placement.
    const moonLayouts = PLANET_MOON_LAYOUTS[planetId] ?? PLANET_MOON_LAYOUTS['earth-like']
    moonLayouts.forEach((layout, index) => {
      const moonProfile: MoonProfileMeta = { ...layout, id: `moon-${planetId}-${index}` }
      const moonPivot = new TransformNode(`moon-pivot-${moonProfile.id}`, scene)
      const moon = MeshBuilder.CreateSphere(
        `moon-body-${moonProfile.id}`,
        { diameter: moonProfile.size * 2, segments: forceLow ? 18 : 28 },
        scene,
      )
      moon.parent = moonPivot
      const moonMat = new PBRMaterial(`moon-mat-${moonProfile.id}`, scene)
      moonMat.albedoColor = Color3.FromHexString(moonProfile.base)
      moonMat.albedoTexture = makeMoonAlbedo(scene, planetSeed + index * 37, moonProfile.base, moonProfile.secondary)
      moonMat.roughness = moonProfile.roughness
      moonMat.metallic = moonProfile.metallic
      moonMat.environmentIntensity = 0.75
      moon.material = moonMat

      if (moonProfile.hasRing) {
        const moonRing = MeshBuilder.CreateTorus(
          `moon-ring-${moonProfile.id}`,
          { diameter: moonProfile.size * 3.2, thickness: moonProfile.size * 0.08, tessellation: 48 },
          scene,
        )
        moonRing.parent = moonPivot
        moonRing.rotation.x = Math.PI * 0.5
        const ringMat = new StandardMaterial(`moon-ring-mat-${moonProfile.id}`, scene)
        ringMat.emissiveColor = Color3.FromHexString(moonProfile.secondary).scale(0.6)
        ringMat.alpha = 0.55
        moonRing.material = ringMat
      }

      moonNodes.push(moonPivot)
      moonPivot.metadata = moonProfile
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

      for (const shipNode of shipNodes) {
        const meta = shipNode.metadata as ShipNodeMeta
        const profile = meta.profile
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
        shipNode.position.copyFrom(worldPos)
        const lookTarget = worldPos.add(worldTan)
        shipNode.lookAt(lookTarget)

        // Animate exhaust jets to avoid static "image" effect.
        const thrustBase = 0.82 + Math.min(0.36, speed * 0.32)
        const jetPower = Math.max(0.7, thrustBase)
        for (const flame of meta.exhaust.core) {
          const flicker = 0.82 + Math.sin(t * flame.pulse + phase * 2.8) * 0.18
          const width = flame.baseWidth * (0.82 + jetPower * 0.22) * (0.9 + flicker * 0.12)
          const length = flame.baseLength * (0.76 + jetPower * 0.9) * (0.9 + flicker * 0.14)
          flame.node.scaling.set(width, length, width)
          flame.node.position.x = flame.baseX
          flame.node.position.z = flame.baseZ - jetPower * 0.04 * flame.decay
          flame.material.alpha = Math.min(0.96, flame.baseAlpha * (0.78 + flicker * 0.36) * flame.decay)
        }
        for (const plume of meta.exhaust.plume) {
          const flicker = 0.86 + Math.sin(t * plume.pulse + phase * 1.9) * 0.14
          const width = plume.baseWidth * (0.94 + jetPower * 0.2) * (0.9 + flicker * 0.06)
          const length = plume.baseLength * (0.9 + jetPower * 0.52) * (0.92 + flicker * 0.08)
          plume.node.scaling.set(width, length, width)
          plume.node.position.x = plume.baseX
          plume.node.position.z = plume.baseZ - jetPower * 0.045 * plume.decay
          plume.material.alpha = Math.min(0.68, plume.baseAlpha * (0.64 + flicker * 0.2) * plume.decay)
        }
      }

      for (const moonPivot of moonNodes) {
        const moon = moonPivot.metadata as MoonProfileMeta
        const angle = t * moon.speed + moon.phase
        const local = new Vector3(Math.cos(angle) * moon.radius, 0, Math.sin(angle) * moon.radius)
        const orbitMatrix = Matrix.RotationYawPitchRoll(moon.spinY, moon.tiltX, 0)
        const worldPos = Vector3.TransformCoordinates(local, orbitMatrix)
        moonPivot.position.copyFrom(worldPos)
        moonPivot.rotation.y += dt * 0.26
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

