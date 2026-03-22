export type GameSnapshot = {
  level: number
  crystals: number
  energy: number
  stardust: number
  passiveIncome: number
  chapterTitle: string
  activePlanetName: string
  fleetLevels: Array<{ name: string; level: number }>
  unlockedPlanets: number
  artifactsOwned: number
  expeditionsRunning: number
  activeEvent: string | null
}

export async function askAiAdvisor(params: {
  message: string
  gameState: GameSnapshot
  mode?: 'advisor' | 'lore' | 'event'
}): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mode: params.mode ?? 'advisor',
      message: params.message,
      gameState: params.gameState,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Не удалось получить ответ ИИ')
  }

  return payload?.answer || 'ИИ не вернул текст ответа.'
}
