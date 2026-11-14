import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { StrictMode } from 'react'
import App from '../../App'

const $ = (sel: string) => document.querySelector(sel) as HTMLElement
const click = (sel: string) => act(() => { fireEvent.click($(sel)) })
const type = (sel: string, value: string) => act(() => { fireEvent.change($(sel), { target: { value } }) })

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); window.AuthService?.logout() })
afterEach(() => { cleanup(); document.documentElement.removeAttribute('data-fontsize') })

function mount() { return render(<StrictMode><App /></StrictMode>) }

describe('계정 탭', () => {
  it('비로그인 → 로그인 → 즐겨찾기 추가/변경/삭제 → 로그아웃', async () => {
    mount()
    expect($('#authGuest').hidden).toBe(false)
    expect($('#authUser').hidden).toBe(true)
    click('[data-provider="google"]')
    expect($('#authUser').hidden).toBe(false)
    expect($('.tab[data-tab="login"]').textContent).toContain('마이페이지')
    expect($('#favEmptyMsg').hidden).toBe(false)

    click('#favAddBtn')
    type('#favAddInput', '코엑스')
    click('#favAddConfirm')
    expect($('.fav-primary').textContent).toBe('코엑스')
    expect(JSON.parse(sessionStorage.getItem('elevSubway.demoFavorites.v1')!)[0]).toMatchObject({ placeName: '코엑스', alias: '' })

    click('#favEditBtn')
    click('.fav-rename-btn')
    type('.fav-item .fav-rename-input', '우리집')
    act(() => { fireEvent.keyDown($('.fav-item .fav-rename-input'), { key: 'Enter' }) })
    expect($('.fav-primary').textContent).toBe('우리집')
    click('#favEditBtn')
    click('.fav-detail-btn')
    expect(document.querySelector('#sheetContent .sheet-title')?.textContent).toContain('우리집')
    click('#subwayDemoPlay')
    expect($('#subwayDemoAnim').classList.contains('running')).toBe(true)

    click('#editNameBtn')
    type('#nameEditInput', '새 사용자')
    click('#nameEditConfirm')
    expect($('#authProfileName').textContent).toBe('새 사용자')
    expect($('#authProfileAvatar').textContent).toBe('새')

    click('[data-auth="signout"]')
    await act(async () => { await Promise.resolve() })
    expect($('#authGuest').hidden).toBe(false)
    expect(JSON.parse(sessionStorage.getItem('elevSubway.demoFavorites.v1')!)).toEqual([])
    expect($('.tab[data-tab="login"]').textContent).toContain('로그인')
  })

  it('글자 크기 칩이 html[data-fontsize]와 저장소를 바꾼다', () => {
    mount()
    click('.fontsize-chip[data-fontsize="xl"]')
    expect(document.documentElement.getAttribute('data-fontsize')).toBe('xl')
    expect(localStorage.getItem('elevSubway.fontSize.v1')).toBe('xl')
    expect($('.fontsize-chip[data-fontsize="xl"]').getAttribute('aria-pressed')).toBe('true')
    click('.fontsize-chip[data-fontsize="normal"]')
    expect(document.documentElement.hasAttribute('data-fontsize')).toBe(false)
  })
})
