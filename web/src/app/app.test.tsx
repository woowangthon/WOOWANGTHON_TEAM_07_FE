import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { StrictMode } from 'react'
import App from '../App'

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null

function mount() {
  return render(<StrictMode><App /></StrictMode>)
}

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }) })
afterEach(() => { cleanup(); vi.useRealTimers(); document.body.removeAttribute('data-active-tab') })

describe('AppShell 마크업', () => {
  it('desktop-stage로 시작하고 원본 id가 모두 있다', () => {
    mount()
    expect(document.body.firstElementChild?.firstElementChild?.className).toBe('desktop-stage')
    for (const id of ['demoPanel', 'phone', 'statusTime', 'dataSourceBadge', 'searchInput', 'searchResults', 'view-map', 'lineFilter',
      'mapContainer', 'zoomIn', 'zoomOut', 'zoomReset', 'view-elevator', 'elevatorList', 'view-time', 'timeForm', 'originSelect',
      'view-chat', 'chatForm', 'view-login', 'authGuest', 'favList', 'sheetBackdrop', 'bottomSheet', 'sheetHandle', 'sheetContent', 'toast']) {
      expect($('#' + id), id).not.toBeNull()
    }
    expect(document.querySelectorAll('.tab-bar .tab[data-tab]').length).toBe(5)
    expect($('#dataSourceBadge')?.hidden).toBe(false) // mock 모드
  })
})

describe('탭', () => {
  it('switchTab: body 속성, 헤더 숨김, active 클래스', () => {
    mount()
    expect(document.body.getAttribute('data-active-tab')).toBe('map')
    act(() => window.App!.switchTab('time') as never)
    expect(document.body.getAttribute('data-active-tab')).toBe('time')
    expect(($('.app-header') as HTMLElement).hidden).toBe(true)
    expect($('#view-time')?.classList.contains('active')).toBe(true)
    expect($('#view-map')?.classList.contains('active')).toBe(false)
    expect($('.tab[data-tab="time"]')?.classList.contains('active')).toBe(true)
    act(() => window.App!.switchTab('elevator') as never)
    expect(($('.app-header') as HTMLElement).hidden).toBe(false)
    act(() => window.App!.switchTab('nope') as never)
    expect(document.body.getAttribute('data-active-tab')).toBe('elevator')
  })

  it('탭 버튼 클릭과 pointerdown 깜빡임', () => {
    mount()
    const tab = $('.tab[data-tab="chat"]') as HTMLElement
    fireEvent.pointerDown(tab)
    expect(tab.classList.contains('pressing')).toBe(true)
    fireEvent.click(tab)
    expect(document.body.getAttribute('data-active-tab')).toBe('chat')
    expect(tab.classList.contains('pressing')).toBe(true) // 다시 그려져도 유지
    fireEvent.animationEnd(tab)
    expect(tab.classList.contains('pressing')).toBe(false)
  })
})

describe('토스트', () => {
  it('2200ms 동안 show', () => {
    mount()
    act(() => window.App!.toast('안녕') as never)
    expect($('#toast')?.textContent).toBe('안녕')
    expect($('#toast')?.classList.contains('show')).toBe(true)
    act(() => { vi.advanceTimersByTime(2100) })
    expect($('#toast')?.classList.contains('show')).toBe(true)
    act(() => { vi.advanceTimersByTime(200) })
    expect($('#toast')?.classList.contains('show')).toBe(false)
  })
})

describe('검색', () => {
  it('결과를 보이고 첫 결과로 Enter하면 역을 연다', () => {
    mount()
    const input = $('#searchInput') as HTMLInputElement
    fireEvent.change(input, { target: { value: '강남' } })
    const results = $('#searchResults') as HTMLElement
    expect(results.classList.contains('show')).toBe(true)
    const items = results.querySelectorAll('.search-item[data-id]')
    expect(items.length).toBeGreaterThan(0)
    expect(items.length).toBeLessThanOrEqual(8)
    expect(items[0].querySelector('.search-name')?.textContent).toBe('강남역')
    const id = items[0].getAttribute('data-id')!
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe('')
    expect(results.classList.contains('show')).toBe(false)
    expect($('#bottomSheet')?.classList.contains('open')).toBe(true)
    expect($('#sheetContent .sheet-summary')).not.toBeNull()
    expect(id).toBeTruthy()
  })

  it('없는 이름이면 빈 안내, 클릭으로 역을 연다', () => {
    mount()
    const input = $('#searchInput') as HTMLInputElement
    fireEvent.change(input, { target: { value: '없는역이름zzz' } })
    expect($('#searchResults .empty')?.textContent).toContain('없는역이름zzz')
    fireEvent.change(input, { target: { value: '서울' } })
    fireEvent.click($('#searchResults .search-item') as HTMLElement)
    expect($('#bottomSheet')?.classList.contains('open')).toBe(true)
  })

  it('Escape로 닫고 탭을 바꾸면 닫는다', () => {
    mount()
    const input = $('#searchInput') as HTMLInputElement
    fireEvent.change(input, { target: { value: '강' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect($('#searchResults')?.classList.contains('show')).toBe(false)
    fireEvent.focus(input) // 값이 남아 있으면 다시 포커스할 때 결과를 다시 보인다
    expect($('#searchResults')?.classList.contains('show')).toBe(true)
    act(() => window.App!.switchTab('elevator') as never)
    expect($('#searchResults')?.classList.contains('show')).toBe(false)
  })
})

describe('바텀 시트', () => {
  it('openStation → peek, 손잡이로 full/peek, Escape로 닫기', () => {
    mount()
    act(() => window.App!.openStation('gangnam') as never)
    const bs = $('#bottomSheet') as HTMLElement
    expect(bs.classList.contains('open')).toBe(true)
    expect(bs.classList.contains('is-peek')).toBe(true)
    expect($('#sheetBackdrop')?.classList.contains('show')).toBe(false)
    expect($('#sheetContent .sheet-title')?.textContent).toContain('강남역')
    expect(($('#sheetHandle') as HTMLElement).getAttribute('aria-label')).toBe('시트 펼치기')
    fireEvent.click($('#sheetHandle') as HTMLElement)
    expect(bs.classList.contains('is-full')).toBe(true)
    expect(bs.classList.contains('is-peek')).toBe(false)
    expect($('#sheetHandle')?.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click($('#sheetHandle') as HTMLElement)
    expect(bs.classList.contains('is-peek')).toBe(true)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(bs.classList.contains('open')).toBe(false)
    expect(bs.classList.contains('is-peek')).toBe(false)
  })

  it('탭을 바꾸면 시트가 닫힌다, 모르는 역은 토스트', () => {
    mount()
    act(() => window.App!.openStation('gangnam') as never)
    act(() => window.App!.switchTab('chat') as never)
    expect($('#bottomSheet')?.classList.contains('open')).toBe(false)
    act(() => window.App!.openStation('nowhere') as never)
    expect($('#toast')?.textContent).toBe('역 정보를 찾을 수 없어요')
  })

  it('auto 시트는 막이 보이고 막을 누르면 닫힌다', () => {
    mount()
    fireEvent.click($('#demoBtn') as HTMLElement)
    expect($('#bottomSheet')?.classList.contains('open')).toBe(true)
    expect($('#sheetBackdrop')?.classList.contains('show')).toBe(true)
    expect(($('#sheetHandle') as HTMLElement).hidden).toBe(true)
    fireEvent.click($('#sheetBackdrop') as HTMLElement)
    expect($('#bottomSheet')?.classList.contains('open')).toBe(false)
  })
})

describe('window.App 호환', () => {
  it('8개 함수와 문자열 도우미', () => {
    mount()
    const app = window.App as Record<string, unknown>
    for (const k of ['openStation', 'switchTab', 'toast', 'openTime', 'closeSheet', 'escapeHtml', 'lineBadges', 'statusPill']) {
      expect(typeof app[k], k).toBe('function')
    }
    expect((app.escapeHtml as (v: unknown) => string)('<a href="x">&\'')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;')
    expect((app.statusPill as (s: string) => string)('AVAILABLE')).toMatch(/^<span class="status-pill ok">/)
    expect((app.lineBadges as (s: unknown) => string)({ lines: ['2'] })).toContain('class="line-badge"')
  })

  it('openTime은 출발계산 탭으로 가고 시트를 닫는다', () => {
    mount()
    act(() => window.App!.openStation('gangnam') as never)
    act(() => (window.App!.openTime as (o: unknown) => void)({ destId: 'gangnam' }))
    expect(document.body.getAttribute('data-active-tab')).toBe('time')
    expect($('#bottomSheet')?.classList.contains('open')).toBe(false)
  })
})

describe('호선 필터', () => {
  it('같은 호선을 다시 누르면 전체', () => {
    mount()
    const spy = vi.spyOn(window.MetroMap, 'setLineFilter')
    const chips = document.querySelectorAll<HTMLElement>('#lineFilter .chip[data-line]')
    expect(chips.length).toBeGreaterThan(2)
    fireEvent.click(chips[1])
    expect(chips[1].classList.contains('active')).toBe(true)
    expect(spy).toHaveBeenLastCalledWith(chips[1].getAttribute('data-line'))
    fireEvent.click(chips[1])
    expect(chips[0].classList.contains('active')).toBe(true)
    expect(spy).toHaveBeenLastCalledWith(null)
  })
})
