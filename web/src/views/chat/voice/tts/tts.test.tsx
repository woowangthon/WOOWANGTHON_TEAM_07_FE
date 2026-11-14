import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatSpeech } from './useChatSpeech'
import { SpeechControls, SpeechSettings } from './SpeechControls'
import { toSpeechText } from './speechText'

class FakeUtterance {
  text: string
  lang = ''
  voice: SpeechSynthesisVoice | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  constructor(text: string) { this.text = text }
}
const korean = { lang: 'ko-KR', localService: true, default: false } as SpeechSynthesisVoice
let voices: SpeechSynthesisVoice[]
let synth: EventTarget & { getVoices: ReturnType<typeof vi.fn>; speak: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> }
beforeEach(() => {
  localStorage.clear()
  voices = [korean]
  synth = Object.assign(new EventTarget(), { getVoices: vi.fn(() => voices), speak: vi.fn(), cancel: vi.fn() })
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Object.defineProperty(document, 'hidden', { configurable: true, value: false }) })

describe('듣기용 글', () => {
  it('경고, 날짜, 노선과 설비 번호를 보존하고 시각과 기호를 읽기 쉽게 바꾼다', () => {
    expect(toSpeechText('⚠️ **주의**: 2호선 8-1번 출구 멈춤.\n수집시각 2026-11-15 20:53. [역 정보](https://example.com) → 확인'))
      .toBe('주의: 2호선 8-1번 출구 멈춤. 수집시각 2026-11-15 오후 여덟 시 오십삼 분. 역 정보 에서 다음으로 확인')
  })
  it('HTML처럼 보이는 원문을 삭제하거나 실행하지 않는다', () => {
    expect(toSpeechText('`<역>` 정보 없음, A < B. 오전 08:00, 00:05:09, 12:30')).toBe('<역> 정보 없음, A < B. 오전 여덟 시 정각, 오전 열두 시 오 분 구 초, 오후 열두 시 삼십 분')
  })
  it('ISO 수집 시각의 날짜와 시간대도 보존한다', () => {
    expect(toSpeechText('수집 2026-11-15T20:53:00+09:00')).toBe('수집 2026-11-15 오후 여덟 시 오십삼 분 UTC 더하기 9 시간 0 분 기준')
  })
})

describe('답변 음성 상태', () => {
  it('처음 열 때 발화하지 않으며 한국어 목소리를 뒤늦게 로드한다', () => {
    voices = []
    const { result } = renderHook(useChatSpeech)
    expect(result.current.supported).toBe(true)
    expect(result.current.ready).toBe(false)
    expect(result.current.mode).toBe('voice')
    expect(synth.speak).not.toHaveBeenCalled()
    act(() => { voices = [korean]; synth.dispatchEvent(new Event('voiceschanged')) })
    expect(result.current.ready).toBe(true)
  })
  it('로컬 한국어 목소리를 우선하고 과거 발화 종료/오류가 현재 상태를 바꾸지 않는다', () => {
    voices = [{ ...korean, localService: false, default: true }, korean]
    const { result } = renderHook(useChatSpeech)
    act(() => result.current.speak(1, '첫 답변'))
    const first = synth.speak.mock.calls[0][0] as FakeUtterance
    expect(first.voice).toBe(korean)
    act(() => result.current.speak(2, '다음 답변'))
    act(() => { first.onend?.(); first.onerror?.({ error: 'network' }) })
    expect(result.current.speakingKey).toBe(2)
    expect(result.current.error).toBe(null)
    act(() => (synth.speak.mock.calls[1][0] as FakeUtterance).onend?.())
    expect(result.current.speakingKey).toBe(null)
    expect(synth.cancel).toHaveBeenCalledTimes(1)
  })
  it('끄기 설정을 저장하지만 수동 재생은 허용한다', () => {
    const { result, unmount } = renderHook(useChatSpeech)
    act(() => result.current.setMode('off'))
    expect(localStorage.getItem('chat-speech-mode')).toBe('off')
    act(() => result.current.speak(4, '경고 확인'))
    expect(result.current.speakingKey).toBe(4)
    unmount()
    expect(synth.cancel).toHaveBeenCalledTimes(1)
    const second = renderHook(useChatSpeech)
    expect(second.result.current.mode).toBe('off')
  })
  it('탭 숨김/중단에 큐를 취소하고 숨김 상태에서는 새로 읽지 않는다', () => {
    const { result } = renderHook(useChatSpeech)
    act(() => result.current.speak(1, '답변'))
    act(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')) })
    expect(result.current.speakingKey).toBe(null)
    act(() => result.current.speak(2, '다음'))
    expect(synth.speak).toHaveBeenCalledTimes(1)
    expect(synth.cancel).toHaveBeenCalledTimes(1)
  })
  it('오류를 안내하며 취소 오류는 안내하지 않는다', () => {
    const { result } = renderHook(useChatSpeech)
    act(() => result.current.speak(1, '답변'))
    act(() => (synth.speak.mock.calls[0][0] as FakeUtterance).onerror?.({ error: 'not-allowed' }))
    expect(result.current.error).toContain('다시 누르거나')
    act(() => result.current.speak(2, '답변'))
    act(() => (synth.speak.mock.calls[1][0] as FakeUtterance).onerror?.({ error: 'interrupted' }))
    expect(result.current.error).toBe(null)
  })
  it('미지원과 한국어 음성 없음에서 읽기 버튼을 숨기고 안내한다', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    function Test() { const speech = useChatSpeech(); return <><SpeechControls messageKey={1} text="답변" speech={speech} /><SpeechSettings speech={speech} /></> }
    render(<Test />)
    expect(screen.queryByRole('button')).toBe(null)
    expect(screen.getByRole('status').textContent).toContain('지원하지')
  })
  it('다른 언어 목소리만 있으면 발화하지 않는다', () => {
    voices = [{ ...korean, lang: 'en-US' }]
    const { result } = renderHook(useChatSpeech)
    expect(result.current.ready).toBe(false)
    act(() => result.current.speak(1, '답변'))
    expect(synth.speak).not.toHaveBeenCalled()
    expect(result.current.error).toContain('한국어 목소리')
  })
  it('기기 발화 함수 예외가 UI를 읽는 중으로 남기지 않는다', () => {
    synth.speak.mockImplementation(() => { throw new Error('device unavailable') })
    const { result } = renderHook(useChatSpeech)
    act(() => result.current.speak(1, '답변'))
    expect(result.current.speakingKey).toBe(null)
    expect(result.current.error).toContain('다시 눌러')
  })
  it('읽기 버튼의 반복 클릭은 중단하며 설정과 외부 처리 안내를 제공한다', () => {
    function Test() { const speech = useChatSpeech(); return <><SpeechControls messageKey={1} text="답변" speech={speech} /><SpeechSettings speech={speech} /></> }
    render(<Test />)
    fireEvent.click(screen.getByRole('button', { name: '답변 듣기' }))
    fireEvent.click(screen.getByRole('button', { name: '읽기 멈추기' }))
    expect(synth.cancel).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('답변 소리로 듣기')).toBeTruthy()
    expect(screen.getByText(/외부 음성 서비스/)).toBeTruthy()
  })
})
