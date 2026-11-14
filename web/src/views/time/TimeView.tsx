/* eslint-disable @typescript-eslint/no-explicit-any -- TimeCalculator 결과는 타입 없는 legacy 경계 */
// 출발 시각 계산 탭(#view-time). 원본 app.js initTimeTab/submitTime/openTime.
// openTime()이 남긴 요청(pendingTime)은 layout effect에서 처리해, App.openTime()이 돌아오기 전에 결과가 DOM에 반영된다.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'
import { useElevatorVersion } from '../../hooks/useElevatorService'
import { allStations, getLine, koCompare, safe, yeok } from '../../lib/stations'
import { pad2 } from '../../lib/time'
import { StationCombo } from './StationCombo'
import { TimeResultView } from './TimeResult'
import { buildResultModel, liveErrorMessage, type ResultModel } from './timeResultModel'
import { DepartureMinutes } from './DepartureMinutes'
import { defaultMinuteDraft, minuteError, minuteFields, type MinuteDraft, type MinuteValues } from './departureMinuteValues'

type Result =
  | { kind: 'empty'; text: string }
  | { kind: 'loading' }
  | { kind: 'error'; text: string }
  | { kind: 'result'; model: ResultModel }

const INITIAL: Result = { kind: 'empty', text: '출발역과 도착역, 도착 희망 시각을 정하고 계산해 보세요.' }

function defaultArriveBy(): string {
  const d = new Date(Date.now() + 60 * 60000)
  let mins = d.getHours() * 60 + d.getMinutes()
  mins = Math.ceil(mins / 10) * 10
  mins = mins % (24 * 60)
  return pad2(Math.floor(mins / 60)) + ':' + pad2(mins % 60)
}

interface Picker { ampm: string; hour: string; min: string }

function toPicker(hhmm: string): Picker | null {
  const tc = window.TimeCalculator
  const p = tc && tc.displayParts ? tc.displayParts(hhmm) : null
  if (!p) return null
  const hm = p.time.split(':')
  return { ampm: p.ampm, hour: hm[0], min: hm[1] }
}

function pickerToHHMM(p: Picker): string {
  const hour = (parseInt(p.hour, 10) % 12) + (p.ampm === '오후' ? 12 : 0)
  return pad2(hour) + ':' + p.min
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINS = Array.from({ length: 12 }, (_, i) => pad2(i * 5))

function stationOptions(stations: ReturnType<typeof allStations>) {
  return stations.map((s) => {
    const shorts = (s.lines || []).map((l) => getLine(l).short).join('·')
    return <option key={s.id} value={s.id}>{yeok(s) + (shorts ? ' (' + shorts + ')' : '')}</option>
  })
}

export function TimeView() {
  const { currentTab, pendingTime, clearPendingTime, openStation } = useApp()
  const version = useElevatorVersion()
  const stations = useMemo(
    () => allStations().sort((a, b) => koCompare(a.name, b.name)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 서비스 데이터가 바뀌면(version) 다시 만든다
    [version],
  )
  const has = (id: string) => stations.some((s) => s.id === id)

  const [originId, setOriginId] = useState(() => (allStations().some((s) => s.id === 'sindorim') ? 'sindorim' : ''))
  const [destId, setDestId] = useState(() => (allStations().some((s) => s.id === 'gangnam') ? 'gangnam' : ''))
  const [modeNow, setModeNow] = useState(false)
  const [picker, setPicker] = useState<Picker>(() => toPicker(defaultArriveBy()) || { ampm: '오후', hour: '3', min: '00' })
  const [result, setResult] = useState<Result>(INITIAL)
  const [busy, setBusy] = useState(false)
  const [minutes, setMinutes] = useState(defaultMinuteDraft)
  const [showMinuteErrors, setShowMinuteErrors] = useState(false)

  const latest = useRef({ originId, destId, modeNow, picker })
  latest.current = { originId, destId, modeNow, picker }
  const liveSeq = useRef(0)
  const originRef = useRef<HTMLSelectElement>(null)
  const destRef = useRef<HTMLSelectElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // 숨은 select는 값이 ''일 때 아무것도 고르지 않은 상태여야 한다(React는 첫 옵션을 고르게 한다).
  useLayoutEffect(() => {
    if (originRef.current) originRef.current.value = originId
    if (destRef.current) destRef.current.value = destId
  })

  const minOptions = useMemo(() => (MINS.includes(picker.min) ? MINS : MINS.concat(picker.min).sort()), [picker.min])
  const arriveByValue = pickerToHHMM(picker)

  useEffect(() => () => { liveSeq.current += 1 }, [])

  function invalidateResult() {
    liveSeq.current += 1
    setBusy(false)
    setResult({ kind: 'empty', text: '입력이 바뀌었어요. 출발 시각을 다시 계산해 주세요.' })
  }

  function changeMinutes(next: MinuteDraft) {
    setMinutes(next)
    invalidateResult()
  }

  function submit(o: string, d: string, arriveBy: string | null) {
    const seq = ++liveSeq.current
    setBusy(false)
    if (!o || !d) { setResult({ kind: 'empty', text: '출발역과 도착역을 선택해 주세요.' }); return }
    if (o === d) { setResult({ kind: 'empty', text: '출발역과 도착역이 같아요. 다른 역을 골라 주세요.' }); return }
    const invalid = minuteFields.find((field) => minuteError(minutes[field.key], field.max))
    setShowMinuteErrors(true)
    if (invalid) {
      const details = document.getElementById('departureMinutes') as HTMLDetailsElement | null
      if (details) details.open = true
      document.getElementById(invalid.key)?.focus()
      setResult({ kind: 'error', text: '이동 시간을 확인해 주세요. 각 항목에 분 단위 정수를 입력해요.' })
      return
    }
    const inputMinutes = Object.fromEntries(minuteFields.map((field) => [field.key, Number(minutes[field.key])])) as MinuteValues
    const tc = window.TimeCalculator
    if (!tc || !tc.calculateDeparture) { setResult({ kind: 'empty', text: '출발 시각 계산기를 불러오지 못했어요.' }); return }
    // 실데이터 모드: BE 경로·출발 시각 API를 쓴다. 모의 계산으로 되돌아가지 않는다.
    if (window.ApiClient && window.ApiClient.isApiMode()) { submitLive(tc, o, d, arriveBy, seq, inputMinutes); return }
    const r = safe('calculateDeparture', () => tc.calculateDeparture({ originId: o, destId: d, arriveBy, now: new Date(), ...inputMinutes }))
    if (!r) { setResult({ kind: 'empty', text: '경로를 찾지 못했어요. 다른 역 조합으로 다시 시도해 주세요.' }); return }
    setResult({ kind: 'result', model: buildResultModel(r, o, d, arriveBy) })
  }

  // API 모드: 로딩 표시 + 제출 버튼 잠금 → BE 결과 렌더. 나중에 시작한 요청만 화면에 반영한다.
  function submitLive(tc: any, o: string, d: string, arriveBy: string | null, seq: number, inputMinutes: MinuteValues) {
    setBusy(true)
    setResult({ kind: 'loading' })
    const run: Promise<any> = Promise.resolve().then(() => tc.calculateDepartureLive
      ? tc.calculateDepartureLive({ originId: o, destId: d, arriveBy, now: new Date(), ...inputMinutes })
      : Promise.reject(new Error('출발 시각 계산기를 불러오지 못했어요.')))
    run.then((r) => {
      if (seq !== liveSeq.current) return
      setResult({ kind: 'result', model: buildResultModel(r, o, d, arriveBy) })
    }).catch((e) => {
      if (seq !== liveSeq.current) return
      console.error('[App] calculateDepartureLive 실패:', e)
      setResult({ kind: 'error', text: liveErrorMessage(e) })
    }).finally(() => {
      if (seq !== liveSeq.current) return
      setBusy(false)
    })
  }

  // openTime 요청 처리: 역 선택 → 모드/시각 반영 → 제출 → 스크롤 맨 위
  useLayoutEffect(() => {
    if (!pendingTime) return
    const req = pendingTime
    const cur = latest.current
    let o = cur.originId, d = cur.destId, now = cur.modeNow, p = cur.picker
    if (req.originId && has(req.originId)) o = req.originId
    if (req.destId && has(req.destId)) d = req.destId
    if (req.hasArriveBy) {
      if (req.arriveBy) { now = false; p = toPicker(req.arriveBy) || p } else now = true
    }
    setOriginId(o); setDestId(d); setModeNow(now); setPicker(p)
    submit(o, d, now ? null : pickerToHHMM(p))
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    clearPendingTime(req.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pendingTime 한 건당 한 번만 처리한다
  }, [pendingTime])

  return (
    <section id="view-time" className={'view' + (currentTab === 'time' ? ' active' : '')} data-view="time">
      <div className="view-scroll" ref={scrollRef}>
        {/* 제목은 화면에서 없애고 화면 읽기용으로만 남긴다 (REQ-TIME-005) */}
        <h2 className="sr-only">출발 시각 계산</h2>
        <form id="timeForm" className="card time-form" noValidate onSubmit={(e) => { e.preventDefault(); submit(originId, destId, modeNow ? null : arriveByValue) }}>
          {/* 계산 방식 고르기 (REQ-TIME-002). 고른 값은 숨은 #modeNow에 둔다 */}
          <div id="timeMode" className="seg" role="radiogroup" aria-label="계산 방식">
            <button type="button" className="seg-btn" role="radio" aria-checked={!modeNow} data-mode="arrive" onClick={() => { setModeNow(false); invalidateResult() }}>도착 시각 맞추기</button>
            <button type="button" className="seg-btn" role="radio" aria-checked={modeNow} data-mode="now" onClick={() => { setModeNow(true); invalidateResult() }}>지금 출발</button>
          </div>
          <input id="modeNow" type="checkbox" hidden checked={modeNow} readOnly />
          {/* 출발역·도착역 검색. 선택한 역 ID는 숨은 select에 보관한다. */}
          <div className="form-row station-pair">
            <div className="form-field">
              <label id="originLabel" className="form-label" htmlFor="originSearch">출발역</label>
              <StationCombo role="origin" label="출발역" value={originId} onChange={(id) => { setOriginId(id); invalidateResult() }} isOption={has} version={version} />
              <select id="originSelect" ref={originRef} aria-label="선택한 출발역" hidden onChange={() => {}}>{stationOptions(stations)}</select>
            </div>
            <button id="swapBtn" className="icon-btn swap-btn" type="button" aria-label="출발/도착 바꾸기" onClick={() => { setOriginId(destId); setDestId(originId); invalidateResult() }}><Icon name="sync_alt" size="lg" /></button>
            <div className="form-field">
              <label id="destLabel" className="form-label" htmlFor="destSearch">도착역</label>
              <StationCombo role="dest" label="도착역" value={destId} onChange={(id) => { setDestId(id); invalidateResult() }} isOption={has} version={version} />
              <select id="destSelect" ref={destRef} aria-label="선택한 도착역" hidden onChange={() => {}}>{stationOptions(stations)}</select>
            </div>
          </div>
          <div className="form-row time-row" hidden={modeNow}>
            <div className="form-field">
              <span id="arriveByLabel" className="form-label">목적지 도착 희망 시각</span>
              <div className="time-picker" role="group" aria-labelledby="arriveByLabel">
                <select id="arriveAmpm" aria-label="오전 오후" value={picker.ampm} onChange={(e) => { setPicker({ ...picker, ampm: e.target.value }); invalidateResult() }}><option value="오전">오전</option><option value="오후">오후</option></select>
                <select id="arriveHour" aria-label="시" value={picker.hour} onChange={(e) => { setPicker({ ...picker, hour: e.target.value }); invalidateResult() }}>{HOURS.map((h) => <option key={h} value={h}>{h}</option>)}</select>
                <span className="time-picker-sep" aria-hidden="true">:</span>
                <select id="arriveMin" aria-label="분" value={picker.min} onChange={(e) => { setPicker({ ...picker, min: e.target.value }); invalidateResult() }}>{minOptions.map((m) => <option key={m} value={m}>{m}</option>)}</select>
              </div>
              <input id="arriveBy" type="hidden" value={arriveByValue} readOnly />
            </div>
          </div>
          <p className="departure-minutes-note">별도 입력이 없으면 역까지 7분, 역 안 3분, 하차 후 3분, 여유 5분의 추정값을 사용해요.</p>
          <DepartureMinutes value={minutes} onChange={changeMinutes} showErrors={showMinuteErrors} />
          <button className="btn btn-primary btn-block btn-main" type="submit" disabled={busy}>출발 시각 계산하기</button>
        </form>
        <div id="timeResult" aria-busy={busy ? 'true' : undefined}
          onClick={(e) => {
            const btn = (e.target as Element).closest('[data-open-station]')
            if (btn) openStation(btn.getAttribute('data-open-station') as string)
          }}>
          {result.kind === 'empty' ? <div className="empty">{result.text}</div> : null}
          {result.kind === 'loading' ? <div className="empty" role="status"><Icon name="hourglass_top" /> 서버에서 경로와 출발 시각을 계산하고 있어요…</div> : null}
          {result.kind === 'error' ? <div className="empty" role="alert">{result.text}</div> : null}
          {result.kind === 'result' ? <TimeResultView m={result.model} /> : null}
        </div>
      </div>
    </section>
  )
}
