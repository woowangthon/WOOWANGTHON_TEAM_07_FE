import { useId } from 'react'
import type { useChatSpeech } from './useChatSpeech'
import './speech.css'

type Speech = ReturnType<typeof useChatSpeech>
export function SpeechControls({ messageKey, text, speech }: { messageKey: number; text: string; speech: Speech }) {
  if (!speech.supported || !speech.ready || !text.trim()) return null
  const active = speech.speakingKey === messageKey
  return <button type="button" className="chat-speech-button" aria-label={active ? '읽기 멈추기' : '답변 듣기'} aria-pressed={active}
    onClick={() => active ? speech.stop() : speech.speak(messageKey, text)}>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {active ? <path d="M6 6h12v12H6z" /> : <><path d="M3 9h4l5-4v14l-5-4H3z" /><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" fill="none" stroke="currentColor" strokeWidth="2" /></>}
    </svg>
    {active ? '멈추기' : '답변 듣기'}
  </button>
}

export function SpeechSettings({ speech }: { speech: Speech }) {
  const id = useId()
  return <div className="chat-speech-settings">
    <label htmlFor={id}>답변 소리로 듣기</label>
    <select id={id} value={speech.mode} disabled={!speech.supported} onChange={event => speech.setMode(event.target.value as Speech['mode'])}>
      <option value="voice">말로 물었을 때만</option><option value="always">항상</option><option value="off">끄기</option>
    </select>
    <p className="chat-speech-notice">기기의 시스템 TTS를 사용해요. 음성 처리 방식은 브라우저와 선택된 목소리에 따라 달라지며, 답변 글이 외부 음성 서비스로 전송될 수 있어요. 화면 읽기와 겹치면 끄기를 선택해 주세요.</p>
    {(!speech.supported || !speech.ready || speech.error) && <p className="chat-speech-notice" role="status">{!speech.supported ? '이 브라우저에서는 답변 소리로 듣기를 지원하지 않아요.' : !speech.ready ? '한국어 목소리를 기다리고 있어요. 계속 보이지 않으면 기기의 한국어 음성 설정을 확인해 주세요.' : speech.error}</p>}
  </div>
}
