// 엘리베이터 탭(#view-elevator). app.js 엘리베이터 탭(요약·필터·목록)을 옮겼다.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'
import { LineBadges } from '../../components/LineBadge'
import { useElevatorVersion } from '../../hooks/useElevatorService'
import { ES } from '../../legacy/services'
import {
  allStations, apiMode, getElevators, getLine, hasData, isDown, koCompare, liveState,
  STATUS_CLASS, statusIcon, statusLabel, stationStatus, yeok,
} from '../../lib/stations'
import { nowHHMM, showBeTime, showTime } from '../../lib/time'
import { mockLines, setCustomFilters, useCustomFilters, useSignedIn } from './filterStore'

const ELEV_FILTERS = [
  { id: 'all', label: '전체역' },
  { id: 'problem', label: '고장·점검' },
  { id: 'transfer', label: '환승역' },
]
const STATUS_RANK: Record<string, number> = { UNAVAILABLE: 0, PARTIAL: 1, AVAILABLE: 2, UNKNOWN: 3 }

interface Item { station: ReturnType<typeof allStations>[number]; status: string; total: number; down: number }

function dataStations(): Item[] {
  const live = apiMode()
  return allStations().filter((s) => live || hasData(s.id)).map((s) => {
    const elevs = getElevators(s.id)
    return { station: s, status: stationStatus(s.id), total: elevs.length, down: elevs.filter(isDown).length }
  })
}

function stoppedWhere(stationId: string): string {
  const stopped = getElevators(stationId).filter(isDown)
  return stopped.length ? stopped[0].location + (stopped.length > 1 ? ' 외 ' + (stopped.length - 1) + '곳' : '') : ''
}

function linesLabel(lines: string[]): string {
  const n = lines.length
  if (!n) return '호선'
  if (n === 1) return lines[0] + '호선'
  if (n === 2) return lines[0] + '·' + lines[1] + '호선'
  return lines[0] + '·' + lines[1] + ' 외 ' + (n - 2)
}

export function ElevatorView() {
  const { currentTab, openStation, openSheet } = useApp()
  const version = useElevatorVersion()
  const signedIn = useSignedIn()
  const customFilters = useCustomFilters()
  const [filter, setFilter] = useState('all')
  const [lines, setLines] = useState<string[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [fadeHidden, setFadeHidden] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 목업에는 갱신 시각이 없어 앱을 연 시각, 상태가 바뀌면 그 시각 (REQ-ELV-003)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- version이 바뀔 때마다 시각을 새로 잡는다
  const updatedAt = useMemo(() => new Date(), [version])

  const updateOverflow = useCallback(() => {
    const s = scrollRef.current
    if (!s) return
    setFadeHidden(s.scrollWidth - s.clientWidth - s.scrollLeft <= 1)
  }, [])
  useEffect(() => {
    const s = scrollRef.current
    if (!s || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(updateOverflow)
    ro.observe(s)
    return () => ro.disconnect()
  }, [updateOverflow])
  useEffect(() => {
    const id = requestAnimationFrame(updateOverflow)
    return () => cancelAnimationFrame(id)
  }, [signedIn, customFilters, updateOverflow])

  const lineMap = mockLines()
  const lineIds = Object.keys(lineMap).sort((x, y) => Number(x) - Number(y))

  const setFilterId = (id: string) => { setFilter(id); if (id !== 'lines') setLines([]) }
  const toggleLine = (id: string) => {
    const next = lines.includes(id) ? lines.filter((x) => x !== id) : [...lines, id]
    next.sort((a, b) => Number(a) - Number(b))
    setLines(next)
    setFilter(next.length ? 'lines' : 'all')
  }

  let updatedText: string
  if (!apiMode()) updatedText = showTime(nowHHMM(updatedAt)) + ' 기준'
  else {
    const ls = liveState(), es = ES()
    if (ls.phase === 'loading') updatedText = '확인 중'
    else if (ls.phase === 'error') updatedText = '연결 실패'
    else updatedText = (es && es.getDataTime ? showBeTime(es.getDataTime()) : null) || '갱신 시각 없음'
  }

  const all = dataStations()
  const counts: Record<string, number> = { AVAILABLE: 0, PARTIAL: 0, UNAVAILABLE: 0, UNKNOWN: 0 }
  all.forEach((x) => { if (counts[x.status] !== undefined) counts[x.status]++ })
  const cards = [{ key: 'AVAILABLE', cls: 'ok' }, { key: 'PARTIAL', cls: 'warn' }, { key: 'UNAVAILABLE', cls: 'bad' }]
  const live = apiMode()
  const lsum = live ? liveState() : null
  let summary
  if (lsum && lsum.phase !== 'ready') {
    summary = <div className="empty">{lsum.phase === 'loading' ? '엘리베이터 상태를 확인 중이에요' : '연결 실패 · 모든 역을 정보 없음으로 표시해요'}</div>
  } else {
    summary = <>
      {cards.map((c) => (
        <div className={'summary-card ' + c.cls} key={c.key}>
          <div className="summary-icon"><Icon name={statusIcon(c.key)} /></div>
          <div className="summary-label">{statusLabel(c.key)}</div>
          <div className="summary-body"><span className="summary-num">{counts[c.key]}</span><span className="summary-unit">역</span></div>
        </div>
      ))}
      {live && <div className="summary-unknown-note muted">{statusLabel('UNKNOWN')} {counts.UNKNOWN}역</div>}
    </>
  }

  const activeCustom = signedIn ? customFilters : []
  const items = all.filter((x) => {
    const sl = x.station.lines || []
    if (activeCustom.length && !sl.some((id) => activeCustom.includes(id))) return false
    switch (filter) {
      case 'problem': return x.down > 0
      case 'transfer': return sl.length > 1
      case 'lines': return sl.some((l) => lines.includes(l))
      default: return true
    }
  })
  items.sort((a, b) => {
    const r = (STATUS_RANK[a.status] || 0) - (STATUS_RANK[b.status] || 0)
    return r !== 0 ? r : koCompare(a.station.name, b.station.name)
  })

  const onRowKey = (e: KeyboardEvent<HTMLDivElement>, id: string) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    openStation(id)
  }

  return (
    <section id="view-elevator" className={'view' + (currentTab === 'elevator' ? ' active' : '')} data-view="elevator">
      <div className="view-scroll">
        {/* 위쪽 흰 영역: 제목 + 요약 카드 + 필터 탭 (REQ-ELV-007) */}
        <div className="elev-head elevator-header">
          <div className="elev-title-row">
            <h2 className="view-title">엘리베이터 현황</h2>
            <span id="elevUpdated" className="elev-updated">{updatedText}</span>
          </div>
          <div id="elevatorSummary" className="summary-grid">{summary}</div>
        </div>
        {/* 상단 고정 필터 탭: 전체역 / 고장·점검 / 환승역 / 호선 ▼ (REQ-ELV-001, REQ-ELV-006) */}
        <div id="elevatorFilter" className="filter-tabs" role="toolbar" aria-label="역 목록 거르기">
          <div id="elevatorFilterScroll" className="elevator-filter-scroll" tabIndex={0} role="region" aria-label="엘리베이터 필터 좌우 스크롤"
            ref={scrollRef} onScroll={updateOverflow}>
            <div className="elevator-filter-inner">
              <div className="filter-tabs-row">
                {ELEV_FILTERS.map((x) => (
                  <button type="button" key={x.id} className={'filter-tab' + (filter === x.id ? ' active' : '')} data-filter={x.id}
                    aria-pressed={filter === x.id} onClick={() => { setPanelOpen(false); setFilterId(x.id) }}>{x.label}</button>
                ))}
                <button type="button" id="elevLineBtn" className={'filter-tab' + (filter === 'lines' ? ' active' : '')} data-filter="lines"
                  aria-pressed={filter === 'lines'} aria-expanded={panelOpen} aria-controls="elevLinePanel"
                  onClick={() => setPanelOpen((o) => !o)}>
                  <span className="tab-label">{linesLabel(lines)}</span><Icon name="expand_more" />
                </button>
              </div>
              <span id="customFilterChips" className="custom-filter-slot" hidden={!signedIn}>
                {signedIn && customFilters.map((lineId) => {
                  const l = getLine(lineId)
                  return (
                    <span className="custom-filter-chip" key={lineId} data-custom-filter={lineId} style={{ '--line-color': l.color } as CSSProperties}>
                      <span className="custom-filter-dot" aria-hidden="true"></span>
                      {l.name}
                      <button type="button" className="chip-x" data-remove-filter={lineId} aria-label={l.name + ' 필터 제거'}
                        onClick={() => setCustomFilters(customFilters.filter((id) => id !== lineId))}>×</button>
                    </span>
                  )
                })}
              </span>
            </div>
          </div>
          <span id="elevatorFilterFade" className="filter-fade" aria-hidden="true" hidden={fadeHidden}></span>
          <button type="button" className="chip-add-btn" id="addFilterBtn" hidden={!signedIn}
            onClick={() => { if (signedIn) openSheet('filter', { stationId: null }, 'auto') }}>
            <Icon name="add" />노선
          </button>
          <div id="elevLinePanel" className="line-panel" role="group" aria-label="호선 고르기" hidden={!panelOpen}>
            {lineIds.map((id) => (
              <button type="button" key={id} className={'line-chip' + (lines.includes(id) ? ' active' : '')} data-line={id}
                aria-pressed={lines.includes(id)} onClick={() => toggleLine(id)}>
                <span className="line-dot" style={{ background: lineMap[id].color }}></span>{lineMap[id].name}
              </button>
            ))}
          </div>
        </div>
        <div id="elevatorList" className="station-list">
          {!items.length ? <div className="empty">선택한 조건에 맞는 역이 없어요</div> : items.map((x) => {
            const s = x.station
            const up = x.total - x.down
            const where = stoppedWhere(s.id)
            const unk = x.status === 'UNKNOWN'
            const sentence = yeok(s) + ', ' + (s.lines || []).join(', ') + '호선, ' + (unk ? '엘리베이터 정보 없음' : '엘리베이터 ' + x.total + '대 중 ' + up + '대 운행') +
              (where ? ', 멈춤 ' + where : '')
            return (
              <div className="station-row elev-row" key={s.id} data-id={s.id} role="button" tabIndex={0} aria-label={sentence}
                onClick={() => openStation(s.id)} onKeyDown={(e) => onRowKey(e, s.id)}>
                <div className="elev-row-name" aria-hidden="true"><strong>{yeok(s)}</strong> <LineBadges station={s} /></div>
                <div className={'elev-row-op ' + (STATUS_CLASS[x.status] || 'unknown')} aria-hidden="true">
                  <Icon name={statusIcon(x.status)} />
                  {unk ? <span>{statusLabel('UNKNOWN')}</span> : <span><b>{up}</b>/{x.total}대</span>}
                </div>
                <span className="chevron ms" aria-hidden="true">chevron_right</span>
                {where && <div className="elev-row-stop" aria-hidden="true">멈춤: {where}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
