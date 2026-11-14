// 시연 제어판의 공용 컴포넌트(데스크톱 #demoPanel과 모바일 시연 시트가 함께 쓴다).
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'
import { LineBadges } from '../../components/LineBadge'
import { useElevatorVersion } from '../../hooks/useElevatorService'
import { apiMode, ELEV_STATUS_TEXT, getElevators, getStation, isDown, yeok } from '../../lib/stations'
import { demoStationAction } from './actions'

export function FullscreenLabel({ fs }: { fs: boolean }) {
  return fs ? <><Icon name="fullscreen_exit" />폰 프레임 모드</> : <><Icon name="fullscreen" />전체화면 모드</>
}

/** "선택한 역" 항목(원본 demoStationHtml). 실데이터 모드에서는 아무것도 그리지 않는다. */
export function DemoStationBlock() {
  const app = useApp()
  useElevatorVersion()
  if (apiMode()) return null // 실데이터 모드에는 가상 고장 전환을 두지 않는다
  const id = app.demoStationId
  const st = id ? getStation(id) : null
  const label = <div className="section-label">선택한 역</div>
  if (!st || !id) return <>{label}<div className="muted">지도에서 역을 선택하세요</div></>
  const elevs = getElevators(id)
  return (
    <>
      {label}
      <div className="demo-station-name">{yeok(st)}{' '}<LineBadges station={st} /></div>
      <div className="demo-station-actions">
        <button type="button" className="btn btn-sm btn-danger" data-demo-act="demo-station-broken" data-act="demo-station-broken" data-broken="1"
          onClick={() => demoStationAction(app, id, 'demo-station-broken', '1')}>이 역 전체 고장</button>
        <button type="button" className="btn btn-sm btn-ghost" data-demo-act="demo-station-broken" data-act="demo-station-broken" data-broken="0"
          onClick={() => demoStationAction(app, id, 'demo-station-broken', '0')}>이 역 전체 복구</button>
      </div>
      {!elevs.length ? <div className="muted">엘리베이터 데이터가 없는 역이에요</div> : (
        <div className="demo-elev-list">
          {elevs.map((e) => {
            const down = isDown(e)
            return (
              <div className="demo-elev-row" key={e.id}>
                <div className="demo-elev-loc">{e.location}{' '}<span className="muted">· {ELEV_STATUS_TEXT[e.status] || e.status}</span></div>
                <button type="button" className={'btn btn-sm ' + (down ? 'btn-ghost' : 'btn-danger')} data-demo-act="demo-toggle-elev" data-act="demo-toggle-elev" data-elev={e.id}
                  onClick={() => demoStationAction(app, id, 'demo-toggle-elev', e.id)}>{down ? '복구' : '고장'}</button>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
