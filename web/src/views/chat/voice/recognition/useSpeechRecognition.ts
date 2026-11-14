import { useCallback, useEffect, useRef, useState } from 'react'
import { getRecognitionConstructor } from './speechRecognitionTypes'
import type { BrowserRecognition } from './speechRecognitionTypes'

export interface VoiceInputProps {
  disabled: boolean
  onTranscript: (text: string) => void
  onListeningChange?: (listening: boolean) => void
  onInterimText?: (text: string) => void
}

const EMPTY_MESSAGE = '잘 못 들었어요. 다시 말씀해 주세요.'
function errorMessage(error: string) {
  switch (error) {
    case 'not-allowed': case 'service-not-allowed':
      return '마이크 권한이 필요해요. 브라우저 설정에서 권한을 허용하거나 글자로 질문해 주세요.'
    case 'no-speech': return EMPTY_MESSAGE
    case 'network': return '음성 인식 서버에 연결하지 못했어요. 인터넷 연결을 확인하거나 글자로 질문해 주세요.'
    case 'audio-capture': return '마이크를 찾지 못했어요. 마이크 연결을 확인하거나 글자로 질문해 주세요.'
    case 'language-not-supported': return '이 브라우저에서 한국어 음성 인식을 사용할 수 없어요. 글자로 질문해 주세요.'
    default: return '음성 입력을 마치지 못했어요. 다시 시도하거나 글자로 질문해 주세요.'
  }
}

export function useSpeechRecognition(props: VoiceInputProps) {
  const latest = useRef(props)
  latest.current = props
  const active = useRef<BrowserRecognition | null>(null)
  const stopping = useRef(false)
  const mounted = useRef(true)
  const [listening, setListening] = useState(false)
  const [message, setMessage] = useState('')
  const supported = Boolean(getRecognitionConstructor())

  const cancel = useCallback((notify: boolean) => {
    const recognition = active.current
    active.current = null
    stopping.current = false
    if (recognition) {
      recognition.onresult = recognition.onerror = recognition.onend = null
      try { recognition.abort() } catch { /* 이미 종료된 브라우저 세션 */ }
      latest.current.onListeningChange?.(false)
      if (notify) latest.current.onInterimText?.('')
    }
    if (mounted.current) setListening(false)
  }, [])

  useEffect(() => {
    mounted.current = true
    const hide = () => {
      if (document.hidden && active.current) {
        cancel(true)
        setMessage('화면을 벗어나 음성 입력을 멈췄어요. 다시 눌러 주세요.')
      }
    }
    document.addEventListener('visibilitychange', hide)
    return () => {
      mounted.current = false
      document.removeEventListener('visibilitychange', hide)
      cancel(false)
    }
  }, [cancel])

  useEffect(() => {
    if (props.disabled) cancel(true)
  }, [props.disabled, cancel])

  const start = useCallback(() => {
    const Constructor = getRecognitionConstructor()
    if (!Constructor || latest.current.disabled || active.current || document.hidden) return
    let recognition: BrowserRecognition
    try { recognition = new Constructor() } catch {
      setMessage('음성 입력을 시작할 수 없어요. 글자로 질문해 주세요.')
      return
    }
    active.current = recognition
    stopping.current = false
    recognition.lang = 'ko-KR'
    recognition.continuous = false
    recognition.interimResults = true
    let finalText = ''
    let interimText = ''
    const current = () => active.current === recognition && !latest.current.disabled && !document.hidden
    recognition.onresult = (event) => {
      if (!current()) return
      // results는 해당 세션 전체 목록이다. resultIndex부터 누적하면 중복될 수 있다.
      const finals: string[] = []
      const interims: string[] = []
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result?.[0]) (result.isFinal ? finals : interims).push(result[0].transcript)
      }
      finalText = finals.join(' ').trim()
      interimText = interims.join(' ').trim()
      latest.current.onInterimText?.([finalText, interimText].filter(Boolean).join(' '))
    }
    recognition.onerror = (event) => {
      if (active.current !== recognition) return
      cancel(true)
      setMessage(errorMessage(event.error))
    }
    recognition.onend = () => {
      if (active.current !== recognition) return
      const canSubmit = current()
      // 수동 중지 시 아직 확정되지 않은 마지막 받아쓰기도 보존한다.
      const text = [finalText, stopping.current ? interimText : ''].filter(Boolean).join(' ').trim()
      active.current = null
      stopping.current = false
      recognition.onresult = recognition.onerror = recognition.onend = null
      setListening(false)
      latest.current.onListeningChange?.(false)
      latest.current.onInterimText?.('')
      if (canSubmit && text) latest.current.onTranscript(text)
      else if (canSubmit) setMessage(EMPTY_MESSAGE)
    }
    setMessage('')
    setListening(true)
    latest.current.onListeningChange?.(true)
    latest.current.onInterimText?.('')
    try { recognition.start() } catch {
      cancel(true)
      setMessage('음성 입력을 시작할 수 없어요. 마이크 권한과 보안 연결(HTTPS)을 확인해 주세요.')
    }
  }, [cancel])

  const stop = useCallback(() => {
    if (!active.current || stopping.current) return
    stopping.current = true
    try { active.current.stop() } catch {
      cancel(true)
      setMessage('음성 입력을 멈췄어요. 다시 시도해 주세요.')
    }
  }, [cancel])

  return { supported, listening, message, start, stop }
}
