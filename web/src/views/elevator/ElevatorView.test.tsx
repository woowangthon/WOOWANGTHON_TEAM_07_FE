import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import App from '../../App'

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null
const $$ = (sel: string) => Array.from(document.querySelectorAll(sel)) as HTMLElement[]

beforeEach(() => { sessionStorage.clear() })
afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.removeAttribute('data-active-tab') })

function liveService(status: 'AVAILABLE' | 'UNKNOWN' = 'UNKNOWN') {
  const es = window.ElevatorService
  vi.spyOn(es, 'isLive').mockReturnValue(true)
  vi.spyOn(es, 'startLive').mockResolvedValue()
  vi.spyOn(es, 'getLiveState').mockReturnValue({ live: true, phase: 'ready', error: null })
  vi.spyOn(es, 'getStationInfo').mockReturnValue({ status, total: 4, unknown: status === 'UNKNOWN' ? 4 : 0, dataFresh: status !== 'UNKNOWN' })
  vi.spyOn(es, 'getElevatorsState').mockReturnValue('idle')
  vi.spyOn(es, 'getElevators').mockReturnValue([])
  vi.spyOn(es, 'getStationStatus').mockReturnValue(status)
  return es
}

describe('엘리베이터 탭', () => {
  it('전체 운행 상태가 미확인이면 0개 카드 대신 정보 없음과 설비 수를 표시한다', () => {
    liveService()
    render(<App />)
    expect($$('#elevatorSummary .summary-card')).toHaveLength(1)
    expect($('#elevatorSummary [role="status"]')?.textContent).toContain('운행 상태 정보 없음')
    expect($('#elevatorSummary')?.textContent).toContain('최신 운행 상태를 확인할 수 없어요')
    expect($('#elevatorList .station-row')?.textContent).toContain('설비 4대')
    expect($('#elevatorList .station-row')?.getAttribute('aria-label')).toContain('미확인: 4대')
    expect($('#elevatorList')?.textContent).not.toContain('0/0대')
  })

  it('설비 상세를 열기 전에도 BE 요약의 대수를 쓰고 고장 필터에 문제 역을 포함한다', () => {
    const es = liveService('AVAILABLE')
    vi.mocked(es.getStationStatus).mockImplementation((id) => id === 'cityhall' ? 'PARTIAL' : 'AVAILABLE')
    render(<App />)
    expect($('#elevatorList .station-row')?.textContent).toContain('설비 4대')
    expect($('#elevatorList')?.textContent).not.toContain('0/0대')
    fireEvent.click($('[data-filter="problem"]')!)
    expect($$('#elevatorList .station-row').map((r) => r.dataset.id)).toEqual(['cityhall'])
  })

  it('일부 설비 상태가 미확인이면 그 설비를 운행 대수에 포함하지 않는다', () => {
    const es = liveService('AVAILABLE')
    vi.mocked(es.getElevatorsState).mockReturnValue('ready')
    vi.mocked(es.getStationInfo).mockReturnValue({ status: 'AVAILABLE', total: 4, unknown: 1, dataFresh: false })
    vi.mocked(es.getElevators).mockReturnValue([
      { id: '1', status: 'AVAILABLE' }, { id: '2', status: 'AVAILABLE' },
      { id: '3', status: 'AVAILABLE' }, { id: '4', status: 'UNKNOWN' },
    ])
    render(<App />)
    expect($('#elevatorList .station-row')?.textContent).toContain('미확인: 1대')
    expect($('#elevatorList .station-row')?.textContent).not.toContain('4/4대')
  })

  it('설비가 0대인 역의 상세 조회가 끝나도 0/0 운행 비율을 만들지 않는다', () => {
    const es = liveService()
    vi.mocked(es.getElevatorsState).mockReturnValue('ready')
    vi.mocked(es.getStationInfo).mockReturnValue({ status: 'UNKNOWN', total: 0, unknown: 0, dataFresh: false })
    render(<App />)
    expect($('#elevatorList .station-row')?.textContent).toContain('정보 없음 · 설비 0대')
    expect($('#elevatorList .station-row')?.textContent).not.toContain('0/0대')
  })

  it('요약 카드 3개, 갱신 시각, 필터 탭 4개, 목록 행', () => {
    render(<App />)
    expect($$('#elevatorSummary .summary-card').length).toBe(3)
    expect($('#elevUpdated')?.textContent).toMatch(/기준$/)
    expect($$('#elevatorFilter .filter-tab').map((t) => t.getAttribute('data-filter'))).toEqual(['all', 'problem', 'transfer', 'lines'])
    expect($$('#elevatorList .station-row[data-id]').length).toBeGreaterThan(0)
    expect($('#addFilterBtn')?.hidden).toBe(true)
  })

  it('정렬: 이용 불가 → 일부 → 정상 순', () => {
    render(<App />)
    const rank: Record<string, number> = { UNAVAILABLE: 0, PARTIAL: 1, AVAILABLE: 2, UNKNOWN: 3 }
    const ranks = $$('#elevatorList .station-row').map((r) => rank[window.ElevatorService.getStationStatus(r.dataset.id!)])
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('호선 칩: 선택하면 라벨이 바뀌고 해당 호선 역만 남는다', () => {
    render(<App />)
    fireEvent.click($('#elevLineBtn')!)
    expect($('#elevLinePanel')?.hidden).toBe(false)
    fireEvent.click($('#elevLinePanel [data-line="2"]')!)
    expect($('#elevLineBtn .tab-label')?.textContent).toBe('2호선')
    const rows = $$('#elevatorList .station-row')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => window.ElevatorService.getStation(r.dataset.id!)?.lines.includes('2'))).toBe(true)
    fireEvent.click($('#elevLinePanel [data-line="2"]')!)
    expect($('#elevLineBtn .tab-label')?.textContent).toBe('호선')
    expect($('[data-filter="all"]')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('행을 누르면 역 시트가 열린다', () => {
    render(<App />)
    fireEvent.click($('#elevatorList .station-row[data-id]')!)
    expect($('#bottomSheet')).not.toBeNull()
    expect(document.body.getAttribute('data-active-tab')).toBe('map')
  })

  it('로그인하면 노선 필터를 추가·저장하고, 로그아웃하면 비운다', async () => {
    render(<App />)
    await act(async () => { await window.AuthService.login('google') })
    expect($('#addFilterBtn')?.hidden).toBe(false)
    fireEvent.click($('#addFilterBtn')!)
    expect($('#filterPicker')).not.toBeNull()
    fireEvent.click($('[data-pick-line="2"]')!)
    expect($('[data-pick-line="2"]')?.classList.contains('selected')).toBe(true)
    fireEvent.click($('#filterPickerDone')!)
    expect(sessionStorage.getItem('elevSubway.elevFilters.v1')).toBe('["2"]')
    expect($$('[data-custom-filter]').length).toBe(1)
    const rows = $$('#elevatorList .station-row')
    expect(rows.every((r) => window.ElevatorService.getStation(r.dataset.id!)?.lines.includes('2'))).toBe(true)
    await act(async () => { await window.AuthService.logout() })
    expect($('#addFilterBtn')?.hidden).toBe(true)
    expect(sessionStorage.getItem('elevSubway.elevFilters.v1')).toBe('[]')
  })
})
