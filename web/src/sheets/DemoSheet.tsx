// 모바일 시연 제어판 시트(app.js renderDemoSheet). #demoBtn이 sheet mode 'demo'로 연다.
import type { SheetContentProps } from '../app/context'
import { useApp } from '../app/context'
import { Icon } from '../components/Icon'
import { useElevatorVersion } from '../hooks/useElevatorService'
import { apiMode } from '../lib/stations'
import {
  demoScenarios, resetDemo, runScenario, toggleFullscreen, useFullscreen,
} from './demo/actions'
import { DemoStationBlock, FullscreenLabel } from './demo/demo'

export function DemoSheet(props: SheetContentProps) {
  void props
  const app = useApp()
  useElevatorVersion()
  const fs = useFullscreen()
  const fsBtn = (
    <button type="button" className="btn btn-ghost btn-block" data-demo-act="demo-fullscreen" data-act="demo-fullscreen" onClick={toggleFullscreen}>
      <FullscreenLabel fs={fs} />
    </button>
  )
  const title = <div className="sheet-title"><Icon name="settings" size="lg" /> 시연 제어판</div>
  if (apiMode()) {
    return (
      <>
        <div className="sheet-header">{title}</div>
        <div className="sheet-section btn-stack">{fsBtn}</div>
      </>
    )
  }
  return (
    <>
      <div className="sheet-header">
        {title}
        <div className="muted">엘리베이터 고장 상황을 만들어 접근성 확인 안내를 살펴보세요.</div>
      </div>
      <div className="sheet-section">
        <div className="section-label">시연 시나리오</div>
        <div className="btn-stack">
          {demoScenarios().map((s) => {
            const sid = s.stationId || s.id
            return (
              <button type="button" className="btn btn-ghost btn-block" data-demo-act="demo-scenario" data-act="demo-scenario" data-id={sid} key={sid}
                onClick={() => runScenario(app, sid)}>{s.label}</button>
            )
          })}
        </div>
      </div>
      <div className="sheet-section"><DemoStationBlock /></div>
      <div className="sheet-section btn-stack">
        <button type="button" className="btn btn-ghost btn-block" data-demo-act="demo-reset" data-act="demo-reset" onClick={() => resetDemo(app)}>
          <Icon name="restart_alt" />전체 상태 초기화
        </button>
        {fsBtn}
      </div>
    </>
  )
}
