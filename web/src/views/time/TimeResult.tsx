import { ExpiringHtml } from '../../components/ExpiringHtml'
/* eslint-disable @typescript-eslint/no-explicit-any -- TimeCalculator 결과는 타입 없는 legacy 경계 */
// 출발 시각 결과(원본 app.js renderTimeResult). 서버 문구는 모두 React 텍스트로만 넣는다.
// DepartureGraphic/AccessibleRouteView는 legacy가 만든 신뢰된 HTML 문자열이라 제출 시점에 한 번 만들어 그대로 넣는다.
import { Icon } from '../../components/Icon'
import { bigTimeParts, showTime } from '../../lib/time'
import { getStation, statusIcon, statusLabel, yeok } from '../../lib/stations'

import type { ResultModel } from './timeResultModel'

function Html({ html }: { html: string }) {
  return <ExpiringHtml html={html} />
}

function BigTime({ hhmm }: { hhmm: string }) {
  const p = bigTimeParts(hhmm)
  return p ? <><span className="big-time-ampm">{p.ampm + ' '}</span>{p.time}</> : <>{hhmm}</>
}

function Sub({ r }: { r: any }) {
  if (r.live && r.alreadyPast) return <div className="big-time-sub warn-text">권장 출발 시각이 이미 지났어요 — 희망 도착 시각에 맞추기 어려울 수 있어요</div>
  if (r.late) return <div className="big-time-sub warn-text">희망 시각까지 도착이 어려워요 — 가장 빠른 도착 {showTime(r.arriveAt)}</div>
  if (typeof r.minutesFromNow === 'number' && r.minutesFromNow < 0) return <div className="big-time-sub warn-text">출발 시각이 {Math.abs(r.minutesFromNow)}분 지났어요 — 지금 바로 출발하세요</div>
  if (!r.minutesFromNow) return <div className="big-time-sub">지금 바로 출발하세요</div>
  return <div className="big-time-sub">지금부터 {r.minutesFromNow}분 후 출발하세요</div>
}

function LiveBasis({ r }: { r: any }) {
  const t = r.selectedTrain
  let text: string
  if (r.timetableUsed && t) {
    text = '시간표 열차 기준 · 열차 ' + t.trainNo + ' · 계획 탑승 ' + showTime(t.boardingAt) +
      (t.alightingAt ? ' · 계획 하차 ' + showTime(t.alightingAt) : '') + ' · 지연은 반영하지 않았어요'
  } else {
    text = '추정 · 실제 열차 시간표를 쓰지 않아 탑승할 열차는 확인되지 않았어요'
  }
  return <div className="card-row muted">{text}</div>
}

function OpenStationBtn({ id }: { id: string }) {
  return <button type="button" className="btn btn-sm btn-ghost" data-open-station={id}>역 정보 보기</button>
}

function LiveWarnings({ m }: { m: ResultModel }) {
  const r = m.r
  const st = r.warningStatus
  const title = st === 'CLEAR'
    ? <><Icon name="check_circle" />확인된 설비 기준으로 경로 위 엘리베이터가 모두 가동 중이에요</>
    : st === 'WARNING' ? <><Icon name="warning" />경로 위 엘리베이터에 주의가 필요해요</>
    : <><Icon name="help" />엘리베이터 상태를 확인하지 못한 역이 있어요</>
  return (
    <>
      <div className="card">
        <div className="card-title">{title}</div>
        {st === 'CLEAR'
          ? <div className="card-sub">확인된 설비 기준이며 이용 가능을 보장하지 않아요. 현장에서 한 번 더 확인해 주세요.</div>
          : (r.warningMessage ? <div className="card-sub">{r.warningMessage}</div> : null)}
      </div>
      {m.warnings.map(({ w, routeHtml }, i) => {
        const kind = w.kind === 'UNCONFIRMED' ? 'UNKNOWN' : w.kind
        const mapped = !!getStation(w.stationId)
        return (
          <div className="card" key={i}>
            <div className="card-title"><Icon name={statusIcon(kind)} />{yeok(w.stationId)} 엘리베이터 {statusLabel(kind)}</div>
            {w.message ? <div className="card-sub">{w.message}</div> : null}
            {mapped ? <>{routeHtml ? <Html html={routeHtml} /> : null}<OpenStationBtn id={w.stationId} /></> : null}
          </div>
        )
      })}
    </>
  )
}

export function TimeResultView({ m }: { m: ResultModel }) {
  const { r, originId, destId, arriveBy } = m
  const route = r.route || {}
  const info: string[] = []
  if (r.boardAt) info.push('탑승 ' + showTime(r.boardAt))
  if (r.arriveAt) info.push('도착 ' + showTime(r.arriveAt))
  if (typeof route.transfers === 'number') info.push('환승 ' + route.transfers + '회')
  if (arriveBy) info.push('희망 ' + showTime(arriveBy))
  if (r.live && r.dateChanged) info.push('자정을 넘겨 도착')
  const limits: string[] = (r.limitations || []).filter(Boolean)
  return (
    <>
      <div className="card">
        <div className="card-sub">{yeok(originId)} → {yeok(destId)} · 집에서 출발 시각</div>
        <div className="big-time"><BigTime hhmm={r.leaveAt} /></div>
        <Sub r={r} />
        {info.length ? <div className="card-row muted">{info.join(' · ')}</div> : null}
        {r.live ? <LiveBasis r={r} /> : null}
        {r.inputMinutes ? <div className="card-row muted">반영한 이동 시간 · 역까지 {r.inputMinutes.walk}분 · 역 안 {r.inputMinutes.entry}분 · 하차 후 목적지까지 {r.inputMinutes.exit}분 · 여유 {r.inputMinutes.buffer}분</div> : null}
      </div>
      {r.live ? <LiveWarnings m={m} /> : m.warnings.map(({ w, routeHtml }, i) => (
        <div className="card" key={i}>
          <div className="card-title"><Icon name="warning" />{yeok(w.stationId)} 엘리베이터 {statusLabel(w.status)}</div>
          {routeHtml ? <Html html={routeHtml} /> : null}
          <OpenStationBtn id={w.stationId} />
        </div>
      ))}
      {m.graphicHtml !== null ? (
        <div className="card"><div className="card-title">출발부터 탑승까지</div><Html html={m.graphicHtml} /></div>
      ) : null}
      {r.live && limits.length ? (
        <div className="card"><div className="card-title">알아 둘 점</div><ul className="limit-list">{limits.map((l, i) => <li key={i}>{l}</li>)}</ul></div>
      ) : null}
    </>
  )
}
