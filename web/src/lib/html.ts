// app.js의 문자열 도우미(HTML 문자열을 돌려준다). window.App 호환과, 아직 HTML 문자열을 만드는 legacy 서비스 연동용이다.
// React 화면에서는 src/components의 LineBadge/StatusPill/Icon을 쓴다.
import type { Station } from '../legacy/globals'
import { getLine, STATUS_CLASS, statusIcon, statusLabel } from './stations'

export function escapeHtml(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Material Symbols 아이콘 HTML. 기본 20px, lg 24px. 장식이라 화면 읽기에서 뺀다. */
export function iconHtml(name: string, size?: 'lg'): string {
  return '<span class="ms' + (size === 'lg' ? ' ms-lg' : '') + '" aria-hidden="true">' + name + '</span>'
}

export function lineBadgeHtml(lineId: string): string {
  const l = getLine(lineId)
  return '<span class="line-badge" style="--line-color:' + escapeHtml(l.color) + '" title="' +
    escapeHtml(l.name) + '">' + escapeHtml(l.short || l.id) + '</span>'
}

export function lineBadges(station?: Pick<Station, 'lines'> | null): string {
  if (!station || !station.lines) return ''
  return station.lines.map(lineBadgeHtml).join('')
}

export function statusPill(status: string): string {
  const cls = STATUS_CLASS[status] || 'unknown'
  return '<span class="status-pill ' + cls + '">' + iconHtml(statusIcon(status)) + escapeHtml(statusLabel(status)) + '</span>'
}
