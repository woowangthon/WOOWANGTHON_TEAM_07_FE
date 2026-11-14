import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import App from '../../App'

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null

afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.removeAttribute('data-active-tab') })

describe('챗 탭', () => {
  it('환영 메시지와 제안 칩', () => {
    render(<App />)
    expect(document.querySelectorAll('#chatMessages .msg.bot').length).toBe(1)
    expect(document.querySelectorAll('#chatSuggestions .chip').length).toBeGreaterThan(0)
  })

  it('전송: 사용자 말풍선, 봇 답변, 입력 비움, 서버 문자열은 이스케이프', async () => {
    render(<App />)
    const input = $('#chatInput') as HTMLInputElement
    fireEvent.change(input, { target: { value: '강남역 엘리베이터 돼?' } })
    fireEvent.submit($('#chatForm')!)
    expect(input.value).toBe('')
    expect(input.disabled).toBe(true)
    expect($('#chatMessages .msg.user .bubble')?.textContent).toBe('강남역 엘리베이터 돼?')
    expect($('#chatMessages .typing')).not.toBeNull()
    await waitFor(() => expect($('#chatMessages .typing')).toBeNull())
    expect(input.disabled).toBe(false)
    expect(document.querySelectorAll('#chatMessages .msg.bot').length).toBe(2)
  })

  it('XSS: 사용자 텍스트는 HTML로 해석되지 않는다', () => {
    render(<App />)
    fireEvent.change($('#chatInput')!, { target: { value: '<img src=x onerror=alert(1)>' } })
    fireEvent.submit($('#chatForm')!)
    expect($('#chatMessages .msg.user img')).toBeNull()
  })

  it('챗 탭으로 전환하면 활성화된다', async () => {
    render(<App />)
    act(() => { (window.App as unknown as { switchTab(n: string): void }).switchTab('chat') })
    expect($('#view-chat')?.classList.contains('active')).toBe(true)
  })
})
