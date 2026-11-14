import { Icon } from './Icon'
import { STATUS_CLASS, statusIcon, statusLabel } from '../lib/stations'

export function StatusPill({ status }: { status: string }) {
  const cls = STATUS_CLASS[status] || 'unknown'
  return <span className={'status-pill ' + cls}><Icon name={statusIcon(status)} />{statusLabel(status)}</span>
}
