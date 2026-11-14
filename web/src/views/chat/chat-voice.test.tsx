import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../../App'
import type { BrowserRecognition } from './voice/recognition/speechRecognitionTypes'
import { responseSpeechText } from './responseSpeechText'

class Recognition implements BrowserRecognition {
  static latest: Recognition
  lang = ''; continuous = false; interimResults = true
  onresult: BrowserRecognition['onresult'] = null
  onerror: BrowserRecognition['onerror'] = null
  onend: BrowserRecognition['onend'] = null
  start = vi.fn(); stop = vi.fn(); abort = vi.fn()
  constructor() { Recognition.latest = this }
  result(text: string, isFinal = true) {
    this.onresult?.({ results: [{ 0: { transcript: text }, length: 1, isFinal }] })
  }
}
class Utterance {
  lang = ''; voice = null; onend = null; onerror = null
  constructor(public text: string) {}
}
let synth: EventTarget & { speak: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> }
const input = () => document.querySelector<HTMLInputElement>('#chatInput')!
function submit(text = '강남역 상태') {
  fireEvent.change(input(), { target: { value: text } })
  fireEvent.submit(document.querySelector('#chatForm')!)
}
function startVoice() {
  fireEvent.click(screen.getByRole('button', { name: '말로 질문하기' }))
  const consent = screen.queryByRole('button', { name: '음성 입력 시작' })
  if (consent) fireEvent.click(consent)
}
beforeEach(() => {
  localStorage.clear()
  synth = Object.assign(new EventTarget(), {
    speak: vi.fn(), cancel: vi.fn(),
    getVoices: () => [{ lang: 'ko-KR', localService: true }],
  })
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
  vi.stubGlobal('SpeechRecognition', Recognition)
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  vi.spyOn(window.AIAgent, 'processMessage').mockResolvedValue({ text: '강남역 정보예요. 수집 시각 오전 06:11. 접근성은 확인이 필요해요.' })
})
afterEach(() => {
  cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear()
  document.body.removeAttribute('data-active-tab')
})
function open() {
  render(<App />)
  act(() => window.App.switchTab('chat'))
}

describe('채팅 음성 통합', () => {
  it('글자 질문은 자동 재생하지 않고 답변 버튼으로 수동 재생한다', async () => {
    open(); submit()
    await waitFor(() => expect(input().disabled).toBe(false))
    expect(synth.speak).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: '답변 듣기' }).at(-1)!)
    expect(synth.speak).toHaveBeenCalledOnce()
    expect(synth.speak.mock.calls[0][0].text).toContain('접근성은 확인이 필요해요')
    expect(synth.speak.mock.calls[0][0].text).toContain('오전 여섯 시 십일 분')
    fireEvent.click(screen.getByRole('button', { name: '읽기 멈추기' }))
    expect(synth.cancel).toHaveBeenCalledOnce()
  })
  it('받아쓰기를 표시하고 한 번 전송하며 기본값에서 답변을 자동으로 읽는다', async () => {
    open(); startVoice()
    act(() => Recognition.latest.result('강남역 엘리베이터', false))
    expect(input().value).toBe('강남역 엘리베이터')
    const end = Recognition.latest.onend!
    act(() => { Recognition.latest.result('강남역 엘리베이터 돼?'); end(); end() })
    await waitFor(() => expect(synth.speak).toHaveBeenCalledOnce())
    expect(window.AIAgent.processMessage).toHaveBeenCalledExactlyOnceWith('강남역 엘리베이터 돼?')
    expect(screen.getByText('말로 보낸 질문')).toBeTruthy()
    expect(input().value).toBe('')
    startVoice()
    expect(synth.cancel).toHaveBeenCalledOnce()
    act(() => window.App.switchTab('map'))
    expect(Recognition.latest.abort).toHaveBeenCalledOnce()
  })
  it('항상/끄기 설정을 적용하고 다른 탭에서 도착한 응답을 자동으로 읽지 않는다', async () => {
    open()
    const setting = screen.getByLabelText('답변 소리로 듣기')
    fireEvent.change(setting, { target: { value: 'always' } })
    submit()
    await waitFor(() => expect(synth.speak).toHaveBeenCalledOnce())
    fireEvent.change(setting, { target: { value: 'off' } })
    submit('시청역 상태')
    await waitFor(() => expect(input().disabled).toBe(false))
    expect(synth.speak).toHaveBeenCalledOnce()
    fireEvent.change(setting, { target: { value: 'always' } })
    let resolve!: (value: { text: string }) => void
    vi.mocked(window.AIAgent.processMessage).mockReturnValueOnce(new Promise(r => { resolve = r }))
    submit('종로역 상태')
    act(() => window.App.switchTab('map'))
    await act(async () => resolve({ text: '종로역 답변' }))
    expect(synth.speak).toHaveBeenCalledOnce()
  })
  it('마이크 오류 뒤에도 작성 중인 글자 질문을 보존하고 전송할 수 있다', async () => {
    open()
    fireEvent.change(input(), { target: { value: '작성 중 질문' } })
    startVoice()
    act(() => Recognition.latest.onerror?.({ error: 'not-allowed' }))
    expect(input().value).toBe('작성 중 질문')
    expect(screen.getByText(/마이크 권한이 필요해요/)).toBeTruthy()
    fireEvent.submit(document.querySelector('#chatForm')!)
    await waitFor(() => expect(window.AIAgent.processMessage).toHaveBeenCalledExactlyOnceWith('작성 중 질문'))
  })
})

describe('카드 듣기', () => {
  it('위치와 고장 사유·경고를 보존하고 아이콘과 버튼은 제외한다', () => {
    const text = responseSpeechText({ text: '역 정보', html: '<div><span class="line-badge">2</span><span aria-hidden="true">cancel</span><div>8-1 출구 고장</div><p>접근성 미확인</p><button>역 상세 보기</button></div>' })
    expect(text).toContain('2호선')
    expect(text).toContain('8-1 출구 고장')
    expect(text).toContain('접근성 미확인')
    expect(text).not.toMatch(/cancel|역 상세 보기/)
  })
  it('API 모드에서는 서버 HTML을 읽기용으로 사용하지 않는다', () => {
    const source = window.APP_CONFIG.dataSource
    window.APP_CONFIG.dataSource = 'api'
    try { expect(responseSpeechText({ text: '실제 답변', html: '<p>허위 경로</p>' })).toBe('실제 답변') }
    finally { window.APP_CONFIG.dataSource = source }
  })
})
