import { useCallback, useEffect, useRef, useState } from 'react'
import { toSpeechText } from './speechText'

export type SpeechMode = 'voice' | 'always' | 'off'
const STORAGE_KEY = 'chat-speech-mode'
function initialMode(): SpeechMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'always' || stored === 'off') return stored
  } catch { /* 저장소를 막은 브라우저에서도 현재 세션에서 설정 가능 */ }
  return 'voice'
}

export function useChatSpeech() {
  const supported = typeof window !== 'undefined' && !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function'
  const [ready, setReady] = useState(false)
  const [speakingKey, setSpeakingKey] = useState<number | null>(null)
  const [mode, updateMode] = useState<SpeechMode>(initialMode)
  const [error, setError] = useState<string | null>(null)
  const voice = useRef<SpeechSynthesisVoice | null>(null)
  const generation = useRef(0)
  const current = useRef<SpeechSynthesisUtterance | null>(null)

  const stop = useCallback(() => {
    generation.current += 1
    const active = current.current
    current.current = null
    setSpeakingKey(null)
    if (active && window.speechSynthesis) window.speechSynthesis.cancel()
  }, [])

  useEffect(() => {
    if (!supported) return
    const synth = window.speechSynthesis
    const loadVoices = () => {
      const korean = synth.getVoices().filter(item => /^ko(?:[-_]|$)/i.test(item.lang))
      voice.current = korean.find(item => item.localService) || korean.find(item => item.default) || korean[0] || null
      setReady(!!voice.current)
      if (!voice.current) stop()
    }
    const hide = () => { if (document.hidden) stop() }
    loadVoices()
    synth.addEventListener('voiceschanged', loadVoices)
    document.addEventListener('visibilitychange', hide)
    return () => {
      synth.removeEventListener('voiceschanged', loadVoices)
      document.removeEventListener('visibilitychange', hide)
      stop()
    }
  }, [supported, stop])

  const setMode = useCallback((next: SpeechMode) => {
    updateMode(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch { /* 세션 설정 유지 */ }
    if (next === 'off') stop()
  }, [stop])

  const speak = useCallback((key: number, text: string) => {
    stop()
    setError(null)
    if (!supported || !voice.current) {
      setError(supported ? '한국어 목소리를 아직 사용할 수 없어요. 기기의 한국어 음성 설정을 확인해 주세요.' : '이 브라우저에서는 답변 소리로 듣기를 지원하지 않아요.')
      return
    }
    const plain = toSpeechText(text)
    if (!plain || document.hidden) return
    const utterance = new window.SpeechSynthesisUtterance(plain)
    utterance.voice = voice.current
    utterance.lang = 'ko-KR'
    const token = generation.current
    current.current = utterance
    const finish = () => {
      if (generation.current !== token || current.current !== utterance) return false
      current.current = null
      setSpeakingKey(null)
      return true
    }
    utterance.onend = () => { finish() }
    utterance.onerror = event => {
      if (finish() && event.error !== 'canceled' && event.error !== 'interrupted') {
        setError('소리로 읽지 못했어요. 답변 듣기를 다시 누르거나 기기의 음성 설정을 확인해 주세요.')
      }
    }
    setSpeakingKey(key)
    try { window.speechSynthesis.speak(utterance) } catch {
      if (finish()) setError('소리로 읽지 못했어요. 답변 듣기를 다시 눌러 주세요.')
    }
  }, [supported, stop])

  return { supported, ready, speakingKey, mode, setMode, speak, stop, error }
}
