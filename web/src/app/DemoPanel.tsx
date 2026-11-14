// 데스크톱 전용 시연 제어판(#demoPanel). app.js 시연 제어판 구간(initDemo)을 옮겼다.
import { useState } from 'react'
import { useApp } from './context'
import { Icon } from '../components/Icon'
import { apiMode } from '../lib/stations'
import {
  demoScenarios, resetDemo, runScenario, toggleFullscreen, useFullscreen,
} from '../sheets/demo/actions'
import { DemoStationBlock, FullscreenLabel } from '../sheets/demo/demo'

export function DemoPanel() {
  const app = useApp()
  const fs = useFullscreen()
  // 실데이터 모드: 가상 고장 제어를 숨긴다. 시작 때 한 번 정한다(원본 initDemo).
  const [live] = useState(() => apiMode())
  const hide = live ? { display: 'none' } : undefined
  return (
    <aside id="demoPanel" className="demo-panel">
      <div className="demo-brand">
        <div className="demo-logo"><Icon name="elevator" size="lg" /></div>
        <div>
          <div className="demo-title">엘리베이터 지하철</div>
          <div className="demo-sub">우왕톤 7팀 · 프로토타입 v0.2</div>
        </div>
      </div>
      <div className="demo-section" style={hide}>
        <div className="section-label">시연 시나리오</div>
        <div id="demoScenarioList" className="demo-list">
          {demoScenarios().map((s) => {
            const sid = s.stationId || s.id
            return <button type="button" className="btn btn-ghost btn-block" data-scenario={sid} key={sid} onClick={() => runScenario(app, sid)}>{s.label}</button>
          })}
        </div>
      </div>
      <div id="demoStation" className="demo-section" style={hide}><DemoStationBlock /></div>
      <div className="demo-section">
        <button id="demoReset" className="btn btn-ghost btn-block" type="button" style={hide} onClick={() => resetDemo(app)}><Icon name="restart_alt" />전체 상태 초기화</button>
        <button id="fullscreenToggle" className="btn btn-ghost btn-block" type="button" onClick={toggleFullscreen}><FullscreenLabel fs={fs} /></button>
      </div>
      <p className="demo-hint muted">노선도에서 역을 누르거나, AI 챗봇에 "강남역 엘리베이터 돼?"라고 물어보세요.</p>
    </aside>
  )
}
