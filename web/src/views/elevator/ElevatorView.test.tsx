import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import App from '../../App'

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null
const $$ = (sel: string) => Array.from(document.querySelectorAll(sel)) as HTMLElement[]

beforeEach(() => { sessionStorage.clear() })
afterEach(() => { cleanup(); document.body.removeAttribute('data-active-tab') })

describe('엘리베이터 탭', () => {
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
