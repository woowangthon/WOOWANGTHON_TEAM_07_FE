import { ExpiringHtml } from '../../components/ExpiringHtml'
// AI 챗봇 탭(#view-chat). 말풍선·액션 버튼·전송 상태를 표시한다.
// 질문 선택지(추천·즐겨찾기 바로 질문)는 화면에서 뺐다. 질문을 보내는 함수(send)는 그대로 둔다 (#86).
// 음성 세부 설정은 마이페이지로 옮겼다 (#85). 챗봇은 저장된 설정을 읽어 답변을 자동 재생한다.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useApp } from '../../app/context'
import type { ChatAction, ChatResponse } from '../../legacy/globals'
import { apiMode, mapCall, safe } from '../../lib/stations'
import { useElevatorVersion } from '../../hooks/useElevatorService'
import { useSession } from '../account/authStore'
import { Icon } from '../../components/Icon'
import { VoiceInput } from './voice/recognition/VoiceInput'
import { SpeechControls, useChatSpeech } from './voice/tts'
import { responseSpeechText } from './responseSpeechText'
import { AnswerText } from './AnswerText'
import './chat-accessibility.css'

type Msg =
  | { key: number; kind: 'user'; text: string; voice?: boolean }
  | { key: number; kind: 'typing' }
  | { key: number; kind: 'bot'; resp: ChatResponse }

/** 원본 formatText: 이스케이프 + 줄바꿈 <br>. React가 이스케이프하므로 줄 단위로 <br>만 넣는다. */
function Text({ text }: { text: string }) {
  const lines = String(text || '').split('\n')
  return <>{lines.map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}</>
}

function initialWelcome(): Msg[] {
  const ai = window.AIAgent
  let resp: ChatResponse | undefined
  if (ai && ai.getWelcome) resp = safe('AIAgent.getWelcome', () => ai.getWelcome())
  else resp = { text: '안녕하세요! 지하철 엘리베이터 도우미예요.' }
  return resp ? [{ key: 0, kind: 'bot', resp }] : []
}

export function ChatView() {
  const session = useSession()
  const sessionRef = useRef(session)
  sessionRef.current = session
  useElevatorVersion()
  const { currentTab, subscribeTabChange, openStation, openTime, toast, pendingChat, clearPendingChat } = useApp()
  const [msgs, setMsgs] = useState<Msg[]>(initialWelcome)
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [announcement, setAnnouncement] = useState('')
  const speech = useChatSpeech()
  const speechRef = useRef(speech)
  speechRef.current = speech
  const activeRef = useRef(currentTab === 'chat')
  activeRef.current = currentTab === 'chat'
  const mountedRef = useRef(true)
  const busyRef = useRef(false)
  const keyRef = useRef(1)
  const refocusRef = useRef(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollChat = useCallback(() => {
    setTimeout(() => { const m = listRef.current; if (m) m.scrollTop = m.scrollHeight }, 0)
  }, [])
  useEffect(() => { scrollChat() }, [msgs, scrollChat])
  useEffect(() => subscribeTabChange((t) => { if (t === 'chat') scrollChat() }), [subscribeTabChange, scrollChat])
  useEffect(() => {
    if (currentTab !== 'chat') speechRef.current.stop()
  }, [currentTab])
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const addBot = useCallback((resp: ChatResponse, replaceKey?: number) => {
    setMsgs((cur) => {
      const m: Msg = { key: replaceKey ?? keyRef.current++, kind: 'bot', resp }
      return replaceKey !== undefined && cur.some((x) => x.key === replaceKey)
        ? cur.map((x) => (x.key === replaceKey ? m : x)) : [...cur, m]
    })
  }, [])

  const send = useCallback((raw: string, refocus?: boolean, voice = false) => {
    const t = String(raw || '').trim()
    if (!t || busyRef.current) return
    speechRef.current.stop()
    setAnnouncement('답변을 확인하고 있어요.')
    const ai = window.AIAgent
    setMsgs((cur) => [...cur, { key: keyRef.current++, kind: 'user', text: t, voice }])
    if (!ai || !ai.processMessage) {
      addBot({ text: 'AI 비서를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' })
      setAnnouncement('AI 비서를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
      return
    }
    busyRef.current = true
    setBusy(true)
    const typingKey = keyRef.current++
    setMsgs((cur) => [...cur, { key: typingKey, kind: 'typing' }])
    const done = (resp: ChatResponse) => {
      if (!mountedRef.current) return
      busyRef.current = false
      setBusy(false)
      addBot(resp, typingKey)
      const s = speechRef.current
      // 마이크로 물은 답변만 기본으로 소리 재생. 비로그인은 저장값 없이 기본 동작을 쓴다.
      const effectiveMode = s.signedIn ? s.mode : 'voice'
      const autoRead = activeRef.current && document.visibilityState !== 'hidden'
        && s.ready && (effectiveMode === 'always' || (voice && effectiveMode === 'voice'))
      if (autoRead) {
        setAnnouncement('답변이 도착했어요. 소리로 읽어 드릴게요.')
        s.speak(typingKey, responseSpeechText(resp))
      } else setAnnouncement(resp.text || '답변이 도착했어요.')
      refocusRef.current = !!refocus
    }
    let p: Promise<ChatResponse>
    try { p = Promise.resolve(ai.processMessage(t)) } catch (e) { p = Promise.reject(e) }
    p.then(done, (err) => {
      console.error('[App] AIAgent.processMessage 실패:', err)
      done({ text: '죄송해요, 답변을 만드는 중에 문제가 생겼어요. 다시 한 번 물어봐 주세요.', suggestions: [] })
    })
  }, [addBot])

  // 입력이 다시 켜진 뒤에 포커스(disabled인 input은 focus가 안 된다).
  useEffect(() => {
    if (!busy && refocusRef.current) { refocusRef.current = false; inputRef.current?.focus() }
  }, [busy])

  // 역 시트 등에서 온 "AI에게 물어보기" 요청. 바쁘면 끝난 뒤에 보낸다.
  useEffect(() => {
    if (!pendingChat || busy) return
    clearPendingChat(pendingChat.id)
    send(pendingChat.text)
  }, [pendingChat, busy, clearPendingChat, send])

  const runAction = (a: ChatAction) => {
    const p = a.payload as { stationId?: string; id?: string } | string | undefined
    switch (a.type) {
      case 'openStation':
        openStation(String(typeof p === 'object' && p ? (p.stationId || p.id) : p))
        break
      case 'showAlternative':
        mapCall('clearHighlights')
        toast('접근 가능한 이동 경로는 확인이 필요해요')
        break
      case 'openTime':
        openTime((p as object) || {})
        break
      default:
        console.warn('[App] 알 수 없는 action type:', a.type)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || busyRef.current || listening) return
    const t = text
    setText('')
    send(t, true)
  }

  return (
    <section id="view-chat" className={'view' + (currentTab === 'chat' ? ' active' : '')} data-view="chat">
      <div id="chatMessages" className="chat-messages" ref={listRef}>
        {msgs.map((m) => {
          if (m.kind === 'user') return <div key={m.key} className="msg user"><div className="bubble">{m.voice ? <span className="chat-voice-origin">말로 보낸 질문</span> : null}<Text text={m.text} /></div></div>
          if (m.kind === 'typing') return <div key={m.key} className="msg bot"><div className="typing"><span></span><span></span><span></span></div></div>
          const r = m.resp || ({} as ChatResponse)
          const actions = (r.actions || []).filter((a) => a.type !== 'showAlternative')
          return (
            <div key={m.key} className="msg bot">
              {r.text ? <div className="bubble bubble-answer"><AnswerText text={r.text} /></div> : null}
              {/* mock 모드 AIAgent가 만든 신뢰된 카드 HTML. 서버 문자열은 절대 여기에 넣지 않는다. */}
              {r.html && !apiMode() ? <ExpiringHtml html={r.html} /> : null}
              {!listening && <SpeechControls messageKey={m.key} text={responseSpeechText(r)} speech={speech} />}
              {actions.length ? (
                <div className="msg-actions">
                  {actions.map((a, i) => (
                    <button key={i} type="button" className="btn btn-sm btn-ghost" data-action-index={i} onClick={() => runAction(a)}>{a.label}</button>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="chat-composer">
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
        <form id="chatForm" className="chat-form" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="chatInput">AI에게 질문하기</label>
          <input id="chatInput" type="text" placeholder={listening ? '듣고 있어요…' : '지금 고장난 역 알려줘'} autoComplete="off" ref={inputRef}
            value={listening ? interim : text} readOnly={listening} disabled={busy} onChange={(e) => setText(e.target.value)} />
          <div onClickCapture={() => speechRef.current.stop()}><VoiceInput disabled={busy || currentTab !== 'chat'}
            onTranscript={(value) => { setInterim(''); send(value, false, true) }}
            onListeningChange={(value) => { setListening(value); if (value) { speechRef.current.stop(); setInterim('') } }}
            onInterimText={setInterim} /></div>
          <button className="btn btn-primary" type="submit" aria-label="보내기" disabled={busy || listening}>
            <Icon name="arrow_upward" size="lg" />
          </button>
        </form>
      </div>
    </section>
  )
}
