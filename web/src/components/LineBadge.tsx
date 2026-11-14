import type { CSSProperties } from 'react'
import { getLine } from '../lib/stations'

export function LineBadge({ lineId }: { lineId: string }) {
  const l = getLine(lineId)
  return <span className="line-badge" style={{ '--line-color': l.color } as CSSProperties} title={l.name}>{l.short || l.id}</span>
}

/** 역의 노선 배지 묶음(app.js lineBadges). */
export function LineBadges({ station }: { station?: { lines?: string[] } | null }) {
  if (!station || !station.lines) return null
  return <>{station.lines.map((id) => <LineBadge key={id} lineId={id} />)}</>
}
