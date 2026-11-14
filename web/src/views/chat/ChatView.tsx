// AI 챗봇 탭(#view-chat). 1단계는 정적 마크업만 둔다(메시지·제안·전송은 2단계, app.js 챗봇 구간).
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'

export function ChatView() {
  const { currentTab } = useApp()
  return (
    <section id="view-chat" className={'view' + (currentTab === 'chat' ? ' active' : '')} data-view="chat">
      <div id="chatMessages" className="chat-messages"></div>
      <div className="chat-composer">
        <div id="chatSuggestions" className="chip-row chat-suggestions"></div>
        <form id="chatForm" className="chat-form" onSubmit={(e) => e.preventDefault()}>
          <input id="chatInput" type="text" placeholder="예) 강남역 엘리베이터 돼?" autoComplete="off" />
          <button className="btn btn-primary" type="submit" aria-label="보내기"><Icon name="arrow_upward" size="lg" /></button>
        </form>
      </div>
    </section>
  )
}
