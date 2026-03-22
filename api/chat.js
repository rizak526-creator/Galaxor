// Serverless API route for Vercel: POST /api/chat
// IMPORTANT: never expose OPENAI_API_KEY on the client.

function buildSystemPrompt(mode) {
  if (mode === 'lore') {
    return [
      'Ты — ИИ-коммандер Galaxor, говоришь по-русски.',
      'Пиши в стиле sci-fi, но коротко и понятно.',
      'Дай 1-2 абзаца, без лишней воды.',
    ].join(' ')
  }

  if (mode === 'event') {
    return [
      'Ты — игровой аналитик Galaxor.',
      'На входе состояние игрока. Выдай краткий разбор текущего события и 2 практических шага.',
      'Пиши только на русском языке.',
    ].join(' ')
  }

  return [
    'Ты — стратегический советник Galaxor (idle-стратегия в Telegram Mini App).',
    'На входе приходит snapshot игрока и вопрос.',
    'Дай конкретные рекомендации, что прокачать/куда лететь/как пройти мини-игры.',
    'Формат: 3-5 коротких пунктов + 1 приоритетный следующий шаг.',
    'Пиши на русском, дружелюбно, без воды.',
  ].join(' ')
}

function buildUserPrompt(mode, userMessage, gameState) {
  return JSON.stringify(
    {
      mode,
      userMessage,
      gameState,
      instruction:
        'Учитывай ресурсы, уровень, планеты, флот, артефакты, активные события и экспедиции.',
    },
    null,
    2,
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'OPENAI_API_KEY is not configured on server' })
  }

  try {
    const { mode = 'advisor', message = '', gameState = {} } = req.body || {}
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: buildSystemPrompt(mode) }],
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: buildUserPrompt(mode, message, gameState),
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(500).json({ error: `OpenAI request failed: ${errText}` })
    }

    const payload = await response.json()
    const answer =
      payload?.output_text ||
      payload?.output?.[0]?.content?.[0]?.text ||
      'Не удалось получить ответ от ИИ.'

    return res.status(200).json({ answer })
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown server error',
    })
  }
}
