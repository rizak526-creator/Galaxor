import { createPortal } from 'react-dom'

type NarrativeModalProps = {
  visible: boolean
  title: string
  description: string
  onClose: () => void
}

export function NarrativeModal({
  visible,
  title,
  description,
  onClose,
}: NarrativeModalProps) {
  if (!visible) return null
  const target = typeof document !== 'undefined' ? document.body : null
  if (!target) return null

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-card">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="modal-body mt-3">
          <p className="whitespace-pre-line text-sm text-slate-200">{description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
        >
          Продолжить
        </button>
      </div>
    </div>,
    target,
  )
}
