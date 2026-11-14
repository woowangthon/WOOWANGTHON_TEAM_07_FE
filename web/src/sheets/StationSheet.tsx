import { ExpiringHtml } from '../components/ExpiringHtml'
// 역 시트(app.js renderStationSheet + onSheetAction). ElevatorService가 바뀌면 다시 그려진다.
import type { CSSProperties } from 'react'
import { useApp, type SheetContentProps } from '../app/context'
import { Icon } from '../components/Icon'
import { LineBadges } from '../components/LineBadge'
import { useElevatorVersion } from '../hooks/useElevatorService'
import {
  apiMode, ELEV_STATUS_TEXT, ELEV_TYPE_TEXT, getElevators, getStation, hasData, isDown, liveState,
  STATUS_CLASS, statusIcon, statusLabel, stationStatus, yeok,
} from '../lib/stations'
import { showBeTime, showTimesIn } from '../lib/time'

// 엘리베이터 운행 현황: 상태 아이콘 + 이름, 운행/전체 대수, 한 대당 한 칸 막대 (REQ-COM-007)
//   멈춘 칸은 역 상태색 + 빗금. 칸이 너무 많으면(OP_MAX_CELLS 초과) 칸 없이 비율 막대
const OP_MAX_CELLS = 12

function OpStatus({ status, total, down }: { status: string; total: number; down: number }) {
  const cls = STATUS_CLASS[status] || 'unknown'
  const head = <span className="op-label"><Icon name={statusIcon(status)} />{statusLabel(status)}</span>
  if (status === 'UNKNOWN' || !total) {
    return <div className={'op-status ' + cls}><div className="op-head">{head}</div></div>
  }
  const up = total - down
  const cells: React.ReactNode[] = []
  if (total <= OP_MAX_CELLS) {
    for (let i = 0; i < total; i++) cells.push(<span key={i} className={'op-cell' + (i < up ? '' : ' down')}></span>)
  } else {
    if (up) cells.push(<span key="u" className="op-cell" style={{ flexGrow: up } as CSSProperties}></span>)
    if (down) cells.push(<span key="d" className="op-cell down" style={{ flexGrow: down } as CSSProperties}></span>)
  }
  const sentence = '엘리베이터 ' + total + '대 중 ' + up + '대 운행 중' + (down ? ', ' + down + '대 멈춤' : '')
  return (
    <div className={'op-status ' + cls}>
      <p className="sr-only">{sentence}</p>
      <div className="op-head" aria-hidden="true">{head}<span className="op-count"><b>{up}</b> / {total}대</span></div>
      <div className="op-bar" aria-hidden="true">{cells}</div>
    </div>
  )
}

// 실데이터 모드: 불러오는 중/실패/기준 시각/BE가 준 한계 문구를 그대로 보여 준다
function LiveNote({ id, status, info, elevState }: { id: string; status: string; info: Record<string, unknown> | null; elevState: string }) {
  const es = window.ElevatorService
  const parts: string[] = []
  const ls = liveState()
  if (ls.phase === 'loading') parts.push('엘리베이터 상태를 확인 중이에요')
  else if (ls.phase === 'error') parts.push('연결 실패 · 상태는 정보 없음으로 표시해요')
  else if (elevState === 'unmapped') parts.push('서버 역 정보와 연결되지 않아 정보 없음이에요')
  else {
    if (status === 'AVAILABLE' && info && !info.dataFresh) parts.push('확인된 설비 기준이에요. 일부 설비 상태는 확인하지 못했어요')
    const t = es && es.getDataTime ? showBeTime(es.getDataTime(id)) : null
    if (elevState === 'ready') parts.push(t ? '서버 확인 시각 ' + t : '서버 확인 시각 없음')
    const lim = es && es.getLimitations ? es.getLimitations(id) : []
    lim.forEach((x) => { parts.push(x) })
  }
  if (!parts.length) return null
  return <div className="sheet-live-note muted">{parts.map((x, i) => <div key={i}>{x}</div>)}</div>
}

function accessibleRouteHtml(stationId: string): string {
  const context = { affectedStationId: stationId, stationName: yeok(stationId) }
  // 현재 서비스는 역별 데모 상태만 보유한다. 경로 근거가 없으면 확인 필요로 표시한다.
  const es = window.ElevatorService
  let snapshot: unknown = null
  if (es && es.getAccessibleRouteSnapshot) {
    try { snapshot = es.getAccessibleRouteSnapshot(context) } catch (e) { console.error('[App] getAccessibleRouteSnapshot 실패:', e) }
  }
  return window.AccessibleRouteView
    ? window.AccessibleRouteView.render(snapshot, context)
    : '<div class="alt-box">접근 가능한 이동 경로는 확인이 필요해요. 역무원에게 확인해 주세요.</div>'
}

export function StationSheet({ sheet }: SheetContentProps) {
  useElevatorVersion()
  const app = useApp()
  const id = sheet.stationId
  const st = getStation(id)
  if (!st || !id) return null

  const status = stationStatus(id)
  const elevs = getElevators(id)
  const data = hasData(id) && elevs.length > 0
  const downCount = elevs.filter(isDown).length
  const live = apiMode()
  const es = window.ElevatorService
  const elevState = live && es && es.getElevatorsState ? es.getElevatorsState(id) : 'ready'
  const info = live && es && es.getStationInfo ? es.getStationInfo(id) : null
  const problem = status === 'PARTIAL' || status === 'UNAVAILABLE'

  const onCalcTime = () => {
    const originSel = document.getElementById('originSelect') as HTMLSelectElement | null
    const origin = originSel ? originSel.value : ''
    const opts: { destId: string; originId?: string } = { destId: id }
    if (!origin || origin === id) opts.originId = id === 'sindorim' ? 'gangnam' : 'sindorim'
    app.openTime(opts)
  }

  let elevBody: React.ReactNode
  if (data) {
    const ordered = es && es.sortForDisplay ? es.sortForDisplay(elevs) : elevs // 멈춘 것 먼저 (REQ-COM-005)
    elevBody = (
      <div className="elev-list">
        {ordered.map((e) => {
          const down = isDown(e)
          const metaParts: string[] = []
          if (e.type && ELEV_TYPE_TEXT[e.type]) metaParts.push(ELEV_TYPE_TEXT[e.type])
          if (e.floors) metaParts.push(e.floors)
          const unk = e.status === 'UNKNOWN'
          return (
            <div className={'elev-item' + (down ? ' down' : '')} key={e.id}>
              <div className="elev-icon"><Icon name={unk ? 'help' : (down ? 'cancel' : 'check_circle')} size="lg" /></div>
              <div className="elev-body" style={{ flex: 1, minWidth: 0 }}>
                <div className="elev-loc">{e.location}{' '}<span className="muted">· {ELEV_STATUS_TEXT[e.status] || e.status}</span></div>
                <div className="elev-meta">{metaParts.join(' · ')}</div>
                {(down || unk) && e.reason ? <div className="elev-reason">{showTimesIn(e.reason)}</div> : null}
              </div>
            </div>
          )
        })}
      </div>
    )
  } else if (live && elevState === 'loading') {
    elevBody = <div className="empty">엘리베이터 정보를 확인 중이에요</div>
  } else if (live && elevState === 'error') {
    elevBody = <div className="empty">연결 실패 · 엘리베이터 정보를 가져오지 못했어요. 상태는 정보 없음으로 봐 주세요</div>
  } else if (live && elevState === 'unmapped') {
    elevBody = <div className="empty">이 역은 서버와 연결된 정보가 없어요 (정보 없음)</div>
  } else {
    elevBody = <div className="empty">이 역은 엘리베이터 데이터가 아직 없어요</div>
  }

  return (
    <>
      {/* 요약 (REQ-COM-004): 역 이름과 운행 현황(REQ-COM-007) */}
      <div className="sheet-summary">
        <div className="sheet-header">
          <div className="sheet-title">{yeok(st)}{' '}<LineBadges station={st} /></div>
          <OpStatus status={live ? status : (data ? status : 'UNKNOWN')} total={live && info ? (info.total as number) - (info.unknown as number) : elevs.length} down={downCount} />
          {live ? <LiveNote id={id} status={status} info={info} elevState={elevState} /> : null}
        </div>
        {problem ? (
          <button type="button" className="btn btn-primary btn-block btn-main sheet-accessibility" data-act="check-accessibility" onClick={() => app.setSheetState('full')}>
            <Icon name="accessible" />접근성 확인
          </button>
        ) : null}
      </div>

      {problem || status === 'UNKNOWN' ? (
        <ExpiringHtml className="sheet-section" html={accessibleRouteHtml(id)} />
      ) : null}

      <div className="sheet-section">
        <div className="section-label">엘리베이터</div>
        {elevBody}
      </div>

      {/* 문제 역에서는 접근성 확인, 나머지는 출발 계산만 강조한다 (REQ-COM-006) */}
      <div className="sheet-section btn-stack">
        <button type="button" className={'btn ' + (problem ? 'btn-ghost' : 'btn-primary') + ' btn-block btn-main'} data-act="calc-time" onClick={onCalcTime}>
          <Icon name="schedule" />이 역까지 출발 시각 계산
        </button>
        <button type="button" className="btn btn-ghost btn-block" data-act="ask-ai" onClick={() => app.askChat(yeok(id) + ' 엘리베이터 돼?')}>
          <Icon name="smart_toy" />AI에게 물어보기
        </button>
      </div>
    </>
  )
}
