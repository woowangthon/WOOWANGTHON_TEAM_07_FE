import { ExpiringHtml } from '../../components/ExpiringHtml'
// AI 챗봇 탭(#view-chat). 원본 app.js 챗봇 구간(welcome, 말풍선, 도구 칩, 액션 버튼, 제안 칩, 전송/busy)을 옮겼다.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'
import type { ChatAction, ChatResponse } from '../../legacy/globals'
import { apiMode, getStation, mapCall, safe } from '../../lib/stations'

type Msg =
  | { key: number; kind: 'user'; text: string }
  | { key: number; kind: 'typing' }
  | { key: number; kind: 'bot'; resp: ChatResponse }

function formatArgVal(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (Array.isArray(v)) return v.map(formatArgVal).filter(Boolean).join('·')
  if (typeof v === 'object') { try { return JSON.stringify(v) } catch { return String(v) } }
  if (typeof v === 'string') { const s = getStation(v); return s ? s.name : v }
  return String(v)
}

function formatToolCall(tc: { name?: string; args?: unknown } | null | undefined): string {
  if (!tc) return ''
  const args = tc.args
  let argStr = ''
  if (args && typeof args === 'object' && !Array.isArray(args)) {
    argStr = Object.keys(args).map((k) => formatArgVal((args as Record<string, unknown>)[k])).filter(Boolean).join(', ')
  } else {
    argStr = formatArgVal(args) || ''
  }
  return (tc.name || 'tool') + '(' + argStr + ')'
}

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
  const { currentTab, subscribeTabChange, openStation, openTime, toast, pendingChat, clearPendingChat } = useApp()
  const [msgs, setMsgs] = useState<Msg[]>(initialWelcome)
  const [suggestions, setSuggestions] = useState<string[]>(() => {
    const m = msgs[0]
    return m && m.kind === 'bot' && m.resp.suggestions ? m.resp.suggestions : []
  })
  const [busy, setBusy] = useState(false)
  const [text, setText] = useState('')
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

  const addBot = useCallback((resp: ChatResponse, replaceKey?: number) => {
    setMsgs((cur) => {
      const m: Msg = { key: replaceKey ?? keyRef.current++, kind: 'bot', resp }
      return replaceKey !== undefined && cur.some((x) => x.key === replaceKey)
        ? cur.map((x) => (x.key === replaceKey ? m : x)) : [...cur, m]
    })
    if (resp && resp.suggestions && resp.suggestions.length) setSuggestions(resp.suggestions)
  }, [])

  const send = useCallback((raw: string, refocus?: boolean) => {
    const t = String(raw || '').trim()
    if (!t || busyRef.current) return
    const ai = window.AIAgent
    setMsgs((cur) => [...cur, { key: keyRef.current++, kind: 'user', text: t }])
    if (!ai || !ai.processMessage) {
      addBot({ text: 'AI 비서를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' })
      return
    }
    busyRef.current = true
    setBusy(true)
    const typingKey = keyRef.current++
    setMsgs((cur) => [...cur, { key: typingKey, kind: 'typing' }])
    const done = (resp: ChatResponse) => {
      busyRef.current = false
      setBusy(false)
      addBot(resp, typingKey)
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
    if (!text.trim() || busyRef.current) return
    const t = text
    setText('')
    send(t, true)
  }

  return (
    <section id="view-chat" className={'view' + (currentTab === 'chat' ? ' active' : '')} data-view="chat">
      <div id="chatMessages" className="chat-messages" ref={listRef}>
        {msgs.map((m) => {
          if (m.kind === 'user') return <div key={m.key} className="msg user"><div className="bubble"><Text text={m.text} /></div></div>
          if (m.kind === 'typing') return <div key={m.key} className="msg bot"><div className="typing"><span></span><span></span><span></span></div></div>
          const r = m.resp || ({} as ChatResponse)
          const actions = (r.actions || []).filter((a) => a.type !== 'showAlternative')
          return (
            <div key={m.key} className="msg bot">
              {(r.toolCalls || []).map((tc, i) => <div key={i} className="tool-chip"><Icon name="build" />{formatToolCall(tc)}</div>)}
              {r.text ? <div className="bubble"><Text text={r.text} /></div> : null}
              {/* mock 모드 AIAgent가 만든 신뢰된 카드 HTML. 서버 문자열은 절대 여기에 넣지 않는다. */}
              {r.html && !apiMode() ? <ExpiringHtml html={r.html} /> : null}
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
        <div id="chatSuggestions" className="chip-row chat-suggestions">
          {suggestions.map((t, i) => (
            <button key={t + i} type="button" className="chip" data-suggest={t} disabled={busy} onClick={() => { if (!busyRef.current) send(t) }}>{t}</button>
          ))}
        </div>
        <form id="chatForm" className="chat-form" onSubmit={onSubmit}>
          <input id="chatInput" type="text" placeholder="예) 강남역 엘리베이터 돼?" autoComplete="off" ref={inputRef}
            value={text} disabled={busy} onChange={(e) => setText(e.target.value)} />
          <button className="btn btn-primary" type="submit" aria-label="보내기" disabled={busy}><Icon name="arrow_upward" size="lg" /></button>
        </form>
      </div>
    </section>
  )
}
