const LABELS = {
  local: 'Saved on this device',
  connecting: 'Connecting to cloud…',
  synced: 'Synced to cloud',
  error: 'Cloud sync failed — saved on this device',
}

export default function SyncStatus({ status }) {
  return (
    <p className={`sync sync--${status}`} role="status">
      <span className="sync__dot" aria-hidden="true" />
      {LABELS[status]}
    </p>
  )
}
