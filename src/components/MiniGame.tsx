import { useEffect, useRef, useState } from 'react'
import type { Planet } from './PlanetMap'

type MiniGameDifficulty = 'easy' | 'normal' | 'hard'

type MiniGameReward = {
  crystals: number
  energy: number
  stardust: number
  artifactRoll: boolean
}

type MiniGameProps = {
  planet: Planet
  level: number
  active: boolean
  remainingSec: number
  cooldownSec: number
  difficulty: MiniGameDifficulty
  onDifficultyChange: (difficulty: MiniGameDifficulty) => void
  onActivate: () => void
  onReward: (reward: MiniGameReward, message: string) => void
}

export function MiniGame({
  planet,
  level,
  active,
  remainingSec,
  cooldownSec,
  difficulty,
  onDifficultyChange,
  onActivate,
  onReward,
}: MiniGameProps) {
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null)
  const [timing, setTiming] = useState(0)
  const [tapCombo, setTapCombo] = useState(0)
  const timingRef = useRef(0)
  const difficultyConfig =
    difficulty === 'easy'
      ? {
          rewardMultiplier: 0.85,
          artifactChance: 0.06,
          swipeThreshold: 40,
          timingSpeed: 6,
          greenMin: 35,
          greenMax: 65,
          comboTarget: 8,
        }
      : difficulty === 'hard'
        ? {
            rewardMultiplier: 1.35,
            artifactChance: 0.14,
            swipeThreshold: 80,
            timingSpeed: 9,
            greenMin: 45,
            greenMax: 55,
            comboTarget: 14,
          }
        : {
            rewardMultiplier: 1,
            artifactChance: 0.08,
            swipeThreshold: 60,
            timingSpeed: 7,
            greenMin: 40,
            greenMax: 60,
            comboTarget: 10,
          }

  useEffect(() => {
    if (!active || planet.id !== 'black-hole') return
    const timer = window.setInterval(() => {
      timingRef.current = (timingRef.current + difficultyConfig.timingSpeed) % 100
      setTiming(timingRef.current)
    }, 80)
    return () => window.clearInterval(timer)
  }, [active, difficultyConfig.timingSpeed, planet.id])

  useEffect(() => {
    if (!active) setTapCombo(0)
  }, [active])

  const giveReward = (multiplier: number, message: string) => {
    const base = Math.max(
      1,
      Math.floor(level * multiplier * difficultyConfig.rewardMultiplier),
    )
    onReward(
      {
        crystals: base * 10,
        energy: Math.max(1, Math.floor(base / 3)),
        stardust: Math.floor(base / 5),
        artifactRoll: Math.random() < difficultyConfig.artifactChance,
      },
      message,
    )
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-white">Мини-игра планеты</h2>
        <button
          type="button"
          onClick={onActivate}
          disabled={active || cooldownSec > 0}
          className="rounded-lg bg-indigo-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
        >
          {active
            ? `Активна: ${remainingSec}с`
            : cooldownSec > 0
              ? `Кд: ${cooldownSec}с`
              : 'Активировать мини-игру'}
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-300">
        Планета: {planet.name}. Режим меняется в зависимости от типа мира.
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => onDifficultyChange('easy')}
          className={`tab-btn ${difficulty === 'easy' ? 'tab-btn-active' : ''}`}
        >
          Лёгкий
        </button>
        <button
          type="button"
          onClick={() => onDifficultyChange('normal')}
          className={`tab-btn ${difficulty === 'normal' ? 'tab-btn-active' : ''}`}
        >
          Норм
        </button>
        <button
          type="button"
          onClick={() => onDifficultyChange('hard')}
          className={`tab-btn ${difficulty === 'hard' ? 'tab-btn-active' : ''}`}
        >
          Хард
        </button>
      </div>

      {!active ? (
        <p className="mt-3 text-sm text-slate-300">
          Активируй режим на 60 секунд для бонусных наград.
        </p>
      ) : planet.id === 'nebula' ? (
        <div
          className="mt-3 rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-4"
          onTouchStart={(event) => {
            const touch = event.touches[0]
            if (touch) setSwipeStartX(touch.clientX)
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0]
            if (!touch || swipeStartX === null) return
            const deltaX = Math.abs(touch.clientX - swipeStartX)
            if (deltaX > difficultyConfig.swipeThreshold)
              giveReward(0.8, 'Nebula Swipe: собрана энергия')
            setSwipeStartX(null)
          }}
          onMouseDown={(event) => setSwipeStartX(event.clientX)}
          onMouseUp={(event) => {
            if (swipeStartX === null) return
            const deltaX = Math.abs(event.clientX - swipeStartX)
            if (deltaX > difficultyConfig.swipeThreshold)
              giveReward(0.8, 'Nebula Swipe: собрана энергия')
            setSwipeStartX(null)
          }}
        >
          <p className="text-sm text-cyan-100">Свайпай влево/вправо для сбора энергии</p>
        </div>
      ) : planet.id === 'black-hole' ? (
        <div className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-4">
          <p className="text-sm text-emerald-100">
            Нажми в зелёной зоне таймера ({difficultyConfig.greenMin}-
            {difficultyConfig.greenMax}) для x3 награды
          </p>
          <div className="mt-3 h-3 rounded-full bg-slate-700">
            <div
              className={`h-3 rounded-full ${
                timing >= difficultyConfig.greenMin &&
                timing <= difficultyConfig.greenMax
                  ? 'bg-emerald-300'
                  : 'bg-cyan-300'
              }`}
              style={{ width: `${timing}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              giveReward(
                timing >= difficultyConfig.greenMin &&
                  timing <= difficultyConfig.greenMax
                  ? 1.6
                  : 0.55,
                'Black Hole Timing',
              )
            }
            className="mt-3 w-full rounded-lg bg-emerald-300 px-3 py-2 text-sm font-semibold text-slate-950"
          >
            Тайминг-клик
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4">
          <p className="text-sm text-amber-100">
            Быстрые тапы по режиму планеты. Собери серию из{' '}
            {difficultyConfig.comboTarget} кликов.
          </p>
          <button
            type="button"
            onClick={() => {
              setTapCombo((prev) => {
                const next = prev + 1
                if (next >= difficultyConfig.comboTarget) {
                  giveReward(1, 'Планетарный комбо-режим')
                  return 0
                }
                return next
              })
            }}
            className="mt-3 w-full rounded-lg bg-amber-300 px-3 py-2 text-sm font-semibold text-slate-950"
          >
            Комбо-тап: {tapCombo}/{difficultyConfig.comboTarget}
          </button>
        </div>
      )}
    </section>
  )
}

export type { MiniGameDifficulty }
