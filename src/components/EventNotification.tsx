type EventNotificationProps = {
  title: string
  description: string
  visible: boolean
}

export function EventNotification({
  title,
  description,
  visible,
}: EventNotificationProps) {
  if (!visible) return null

  return (
    <div className="event-notice">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-slate-200">{description}</p>
    </div>
  )
}
