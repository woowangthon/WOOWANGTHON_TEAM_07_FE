import { useId, useRef, useState } from 'react'
import { Icon } from '../../../../components/Icon'
import { useSpeechRecognition } from './useSpeechRecognition'
import type { VoiceInputProps } from './useSpeechRecognition'
import './voice-input.css'

export type { VoiceInputProps } from './useSpeechRecognition'

export function VoiceInput(props: VoiceInputProps) {
  const { supported, listening, message, start, stop } = useSpeechRecognition(props)
  const [consented, setConsented] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const noticeId = useId()
  if (!supported) return null

  function close() {
    setConfirming(false)
    button.current?.focus()
  }

  return <div className="voice-input">
    <button ref={button} type="button" className="voice-input-button"
      disabled={props.disabled} aria-label={listening ? '듣기 멈추기' : '말로 질문하기'}
      aria-pressed={listening} aria-expanded={confirming && !props.disabled}
      onClick={() => {
        if (listening) stop()
        else if (consented) start()
        else setConfirming(true)
      }}>
      <Icon name={listening ? 'stop' : 'mic'} size="lg" />
    </button>
    {confirming && !props.disabled && <section className="voice-input-notice" aria-label="음성 입력 안내"
      onKeyDown={event => { if (event.key === 'Escape') close() }}>
      <p id={noticeId}>음성은 브라우저 제공업체의 음성 인식 서버로 전송될 수 있어요. 인식이 끝나면 질문이 자동으로 전송돼요. 민감한 정보는 말하지 마세요.</p>
      <div className="voice-input-actions">
        <button type="button" aria-describedby={noticeId} disabled={props.disabled}
          onClick={() => { setConsented(true); close(); start() }}>음성 입력 시작</button>
        <button type="button" onClick={close}>취소</button>
      </div>
    </section>}
    <span className="voice-input-status" role="status" aria-live="polite">
      {listening ? '듣고 있어요… 멈춤 버튼을 누르면 질문을 보내요.' : message}
    </span>
  </div>
}
