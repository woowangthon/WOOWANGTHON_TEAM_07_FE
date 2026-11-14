// 데스크톱 전용 시연 제어판(#demoPanel). 1단계는 정적 마크업과 빈 컨테이너만 둔다.
// 2단계에서 시나리오 목록(#demoScenarioList), 선택한 역(#demoStation), 초기화·전체화면 동작을 채운다(app.js 시연 제어판 구간).
import { Icon } from '../components/Icon'

export function DemoPanel() {
  return (
    <aside id="demoPanel" className="demo-panel">
      <div className="demo-brand">
        <div className="demo-logo"><Icon name="elevator" size="lg" /></div>
        <div>
          <div className="demo-title">엘리베이터 지하철</div>
          <div className="demo-sub">우왕톤 7팀 · 프로토타입 v0.2</div>
        </div>
      </div>
      <div className="demo-section">
        <div className="section-label">시연 시나리오</div>
        <div id="demoScenarioList" className="demo-list"></div>
      </div>
      <div id="demoStation" className="demo-section"></div>
      <div className="demo-section">
        <button id="demoReset" className="btn btn-ghost btn-block" type="button"><Icon name="restart_alt" />전체 상태 초기화</button>
        <button id="fullscreenToggle" className="btn btn-ghost btn-block" type="button"><Icon name="fullscreen" />전체화면 모드</button>
      </div>
      <p className="demo-hint muted">노선도에서 역을 누르거나, AI 챗봇에 "강남역 엘리베이터 돼?"라고 물어보세요.</p>
    </aside>
  )
}
