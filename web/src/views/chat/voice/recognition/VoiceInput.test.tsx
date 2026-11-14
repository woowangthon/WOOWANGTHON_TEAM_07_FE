import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { VoiceInput } from './VoiceInput'
import { useSpeechRecognition } from './useSpeechRecognition'
import type { BrowserRecognition, RecognitionEvent } from './speechRecognitionTypes'

class FakeRecognition implements BrowserRecognition {
  static instances: FakeRecognition[] = []
  lang = ''; continuous = true; interimResults = false
  onresult: BrowserRecognition['onresult'] = null
  onerror: BrowserRecognition['onerror'] = null
  onend: BrowserRecognition['onend'] = null
  start = vi.fn()
  stop = vi.fn()
  abort = vi.fn()
  constructor() { FakeRecognition.instances.push(this) }
  result(parts: [string, boolean][]) {
    this.onresult?.({ results: parts.map(([transcript, isFinal]) => ({ 0: { transcript }, length: 1, isFinal })) })
  }
}
const last = () => FakeRecognition.instances.at(-1)!
beforeEach(() => {
  FakeRecognition.instances = []
  vi.stubGlobal('SpeechRecognition', FakeRecognition)
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('음성 입력', () => {
  it('고지 확인 전 마이크를 시작하지 않고 명시적인 확인 후 시작한다', () => {
    render(<VoiceInput disabled={false} onTranscript={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '말로 질문하기' }))
    expect(FakeRecognition.instances).toHaveLength(0)
    expect(screen.getByText(/브라우저 제공업체/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '음성 입력 시작' }))
    expect(last().start).toHaveBeenCalledOnce()
    expect(last().lang).toBe('ko-KR')
    expect(last().continuous).toBe(false)
    expect(last().interimResults).toBe(true)
    expect(screen.getByRole('button', { name: '듣기 멈추기' })).toBeTruthy()
  })

  it('지원하지 않으면 마이크 버튼을 숨기고 접두사 구현도 지원한다', () => {
    vi.stubGlobal('SpeechRecognition', undefined)
    const first = render(<VoiceInput disabled={false} onTranscript={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
    first.unmount()
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition)
    render(<VoiceInput disabled={false} onTranscript={vi.fn()} />)
    expect(screen.getByRole('button', { name: '말로 질문하기' })).toBeTruthy()
  })

  it('중간 결과를 교체하고 종료 시 확정 문장만 정확히 한 번 보낸다', () => {
    const onTranscript = vi.fn(), onInterimText = vi.fn(), onListeningChange = vi.fn()
    const { result } = renderHook(() => useSpeechRecognition({ disabled: false, onTranscript, onInterimText, onListeningChange }))
    act(() => { result.current.start(); result.current.start() })
    expect(FakeRecognition.instances).toHaveLength(1)
    act(() => last().result([['강남', false]]))
    expect(onInterimText).toHaveBeenLastCalledWith('강남')
    act(() => last().result([['강남역', true], ['엘리베이터', false]]))
    act(() => last().result([['강남역 엘리베이터 돼?', true]]))
    const end = last().onend!
    act(() => { end(); end() })
    expect(onTranscript).toHaveBeenCalledExactlyOnceWith('강남역 엘리베이터 돼?')
    expect(onListeningChange.mock.calls).toEqual([[true], [false]])
  })

  it('수동 중지는 마지막 받아쓰기를 보존하며 연속 중지 요청을 무시한다', () => {
    const onTranscript = vi.fn()
    const { result } = renderHook(() => useSpeechRecognition({ disabled: false, onTranscript }))
    act(() => result.current.start())
    act(() => last().result([['종로', true], ['상태', false]]))
    act(() => { result.current.stop(); result.current.stop(); result.current.start() })
    expect(last().stop).toHaveBeenCalledOnce()
    expect(FakeRecognition.instances).toHaveLength(1)
    act(() => last().onend?.())
    expect(onTranscript).toHaveBeenCalledExactlyOnceWith('종로 상태')
  })

  it.each([
    ['not-allowed', '마이크 권한이 필요해요'],
    ['service-not-allowed', '마이크 권한이 필요해요'],
    ['no-speech', '잘 못 들었어요'],
    ['network', '인터넷 연결'],
    ['audio-capture', '마이크를 찾지 못했어요'],
  ])('%s 오류는 안내하며 부분 결과를 전송하지 않는다', (error, notice) => {
    const onTranscript = vi.fn()
    const { result } = renderHook(() => useSpeechRecognition({ disabled: false, onTranscript }))
    act(() => result.current.start())
    act(() => last().result([['잘못된 질문', true]]))
    const end = last().onend!
    act(() => last().onerror?.({ error }))
    act(() => end())
    expect(result.current.message).toContain(notice)
    expect(result.current.listening).toBe(false)
    expect(onTranscript).not.toHaveBeenCalled()
  })

  it('무음 종료는 전송 없이 재시도 안내를 한다', () => {
    const onTranscript = vi.fn()
    const { result } = renderHook(() => useSpeechRecognition({ disabled: false, onTranscript }))
    act(() => result.current.start())
    act(() => last().onend?.())
    expect(result.current.message).toContain('잘 못 들었어요')
    expect(onTranscript).not.toHaveBeenCalled()
  })

  it('disabled 전환 시 취소하고 늦게 도착한 이벤트와 재시작을 무시한다', () => {
    const onTranscript = vi.fn(), onInterimText = vi.fn()
    const { result, rerender } = renderHook(({ disabled }) => useSpeechRecognition({ disabled, onTranscript, onInterimText }), { initialProps: { disabled: false } })
    act(() => result.current.start())
    const event = last().onresult!, end = last().onend!
    rerender({ disabled: true })
    act(() => {
      event({ results: [{ 0: { transcript: '취소된 질문' }, length: 1, isFinal: true }] } as RecognitionEvent)
      end(); result.current.start()
    })
    expect(last().abort).toHaveBeenCalledOnce()
    expect(FakeRecognition.instances).toHaveLength(1)
    expect(onTranscript).not.toHaveBeenCalled()
  })

  it('탭 숨김과 컴포넌트 해제 시 세션을 취소하고 핸들러를 제거한다', () => {
    const onTranscript = vi.fn()
    const { result, unmount } = renderHook(() => useSpeechRecognition({ disabled: false, onTranscript }))
    act(() => result.current.start())
    const first = last()
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(first.abort).toHaveBeenCalledOnce()
    expect(first.onresult).toBeNull()
    expect(result.current.message).toContain('화면을 벗어나')
    Object.defineProperty(document, 'hidden', { configurable: true, value: false })
    act(() => result.current.start())
    unmount()
    expect(last().abort).toHaveBeenCalledOnce()
    expect(last().onend).toBeNull()
    expect(onTranscript).not.toHaveBeenCalled()
  })

  it('고지를 취소하면 시작하지 않으며 키보드로도 닫을 수 있다', () => {
    render(<VoiceInput disabled={false} onTranscript={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '말로 질문하기' }))
    fireEvent.keyDown(screen.getByRole('region', { name: '음성 입력 안내' }), { key: 'Escape' })
    expect(screen.queryByText(/브라우저 제공업체/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '말로 질문하기' }))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(FakeRecognition.instances).toHaveLength(0)
  })
})
