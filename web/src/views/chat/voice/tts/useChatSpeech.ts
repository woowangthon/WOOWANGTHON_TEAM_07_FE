import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { toSpeechText } from './speechText'
import { useSession } from '../../../account/authStore'

export type SpeechMode = 'voice' | 'always' | 'off'
export type SpeechRate = 0.8 | 1 | 1.2
export const SPEECH_RATES: SpeechRate[] = [0.8, 1, 1.2]

const MODE_KEY = 'chat-speech-mode'
const RATE_KEY = 'chat-speech-rate'

// 설정 저장값은 이 기기 localStorage에 둔다. 서버 저장 API는 아직 없다 (#85).
// 로그인 여부에 따라 적용하는 값은 useChatSpeech의 mode·rate에서 정한다. 여기서는 저장값만 읽고 쓴다.
function readStoredMode(): SpeechMode {
  try {
    const stored = localStorage.getItem(MODE_KEY)
    if (stored === 'always' || stored === 'off' || stored === 'voice') return stored
  } catch { /* 저장소를 막은 브라우저에서도 현재 세션에서 설정 가능 */ }
  return 'voice'
}
function readStoredRate(): SpeechRate {
  try {
    const stored = Number(localStorage.getItem(RATE_KEY))
    if (SPEECH_RATES.includes(stored as SpeechRate)) return stored as SpeechRate
  } catch { /* 기본 속도 */ }
  return 1
}

// 같은 화면 안(챗봇·마이페이지)의 여러 훅 인스턴스가 설정 변경을 바로 공유하도록 외부 저장소로 둔다.
const prefListeners = new Set<() => void>()
function subscribePrefs(fn: () => void) {
  prefListeners.add(fn)
  const onStorage = () => fn()
  window.addEventListener('storage', onStorage)
  return () => { prefListeners.delete(fn); window.removeEventListener('storage', onStorage) }
}
function prefSnapshot(): string {
  return `${readStoredMode()}|${readStoredRate()}`
}
function notifyPrefs() { prefListeners.forEach((fn) => fn()) }

export function useChatSpeech() {
  const supported = typeof window !== 'undefined' && !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function'
  const session = useSession()
  const signedIn = !!(session && typeof session === 'object')
  const [ready, setReady] = useState(false)
  const [speakingKey, setSpeakingKey] = useState<number | null>(null)
  const snapshot = useSyncExternalStore(subscribePrefs, prefSnapshot, prefSnapshot)
  const [storedMode, storedRate] = snapshot.split('|')
  const storedModeValue = storedMode as SpeechMode
  const storedRateValue = Number(storedRate) as SpeechRate
  // mode는 저장값 그대로 둔다. 챗봇은 signedIn이 아니면 'voice'(기본)로 읽는다. 속도는 아래 rate에서 비로그인이면 1로 고정한다.
  const mode: SpeechMode = storedModeValue
  const rate: SpeechRate = signedIn ? storedRateValue : 1
  const [error, setError] = useState<string | null>(null)
  const voice = useRef<SpeechSynthesisVoice | null>(null)
  const generation = useRef(0)
  const current = useRef<SpeechSynthesisUtterance | null>(null)
  const rateRef = useRef(rate)
  rateRef.current = rate

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
    try { localStorage.setItem(MODE_KEY, next) } catch { /* 세션 설정 유지 */ }
    notifyPrefs()
    if (next === 'off') stop()
  }, [stop])

  const setRate = useCallback((next: SpeechRate) => {
    try { localStorage.setItem(RATE_KEY, String(next)) } catch { /* 세션 설정 유지 */ }
    notifyPrefs()
  }, [])

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
    utterance.rate = rateRef.current
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

  return { supported, ready, speakingKey, mode, rate, setMode, setRate, speak, stop, error, signedIn }
}
