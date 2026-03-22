type AIPanelProps = {
  question: string
  answer: string
  loading: boolean
  error: string
  onQuestionChange: (value: string) => void
  onAsk: () => void
  onUsePreset: (value: string) => void
}

const PRESETS = [
  'Что мне прокачать в ближайшие 10 минут?',
  'На какую планету перейти и почему?',
  'Как лучше использовать экспедиции сейчас?',
  'Как быстрее нафармить звёздную пыль?',
]

export function AIPanel({
  question,
  answer,
  loading,
  error,
  onQuestionChange,
  onAsk,
  onUsePreset,
}: AIPanelProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/35 p-4">
      <h2 className="text-base font-semibold text-white">ИИ-советник (GPT-4o mini)</h2>
      <p className="mt-1 text-xs text-slate-300">
        Анализирует твой прогресс и даёт стратегические подсказки.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onUsePreset(preset)}
            className="rounded-full border border-cyan-300/40 px-3 py-1 text-xs text-cyan-100 hover:bg-cyan-400/10"
          >
            {preset}
          </button>
        ))}
      </div>

      <textarea
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        placeholder="Например: Что сейчас выгоднее — флот или артефакты?"
        className="mt-3 min-h-24 w-full rounded-xl border border-white/15 bg-slate-950/65 p-3 text-sm text-slate-100 outline-none focus:border-cyan-300/70"
      />

      <button
        type="button"
        onClick={onAsk}
        disabled={loading || !question.trim()}
        className="mt-3 w-full rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
      >
        {loading ? 'Думаю...' : 'Спросить ИИ'}
      </button>

      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

      {answer && (
        <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/60 p-3">
          <p className="whitespace-pre-line text-sm text-slate-100">{answer}</p>
        </div>
      )}
    </section>
  )
}
