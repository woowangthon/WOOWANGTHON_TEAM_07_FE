import type { SheetContentProps } from '../app/context'
import { LineBadges } from '../components/LineBadge'
import { getStation, yeok } from '../lib/stations'
import { useElevatorVersion } from '../hooks/useElevatorService'

// 1단계 자리표시자: 역 이름만 보인다(.sheet-summary가 있어야 시트 요약 높이가 계산된다).
// 2단계에서 운행 현황·엘리베이터 목록·접근성·버튼으로 채운다(app.js renderStationSheet).
export function StationSheet({ sheet }: SheetContentProps) {
  useElevatorVersion()
  const st = getStation(sheet.stationId)
  if (!st) return null
  return (
    <div className="sheet-summary">
      <div className="sheet-header">
        <div className="sheet-title">{yeok(st)} <LineBadges station={st} /></div>
      </div>
    </div>
  )
}
