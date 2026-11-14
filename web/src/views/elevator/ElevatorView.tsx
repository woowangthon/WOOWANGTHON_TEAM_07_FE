// 엘리베이터 탭(#view-elevator). 1단계는 정적 마크업과 빈 컨테이너만 둔다. 요약·필터·목록 채우기는 2단계(app.js renderElevatorTab).
import { useApp } from '../../app/context'

export function ElevatorView() {
  const { currentTab } = useApp()
  return (
    <section id="view-elevator" className={'view' + (currentTab === 'elevator' ? ' active' : '')} data-view="elevator">
      <div className="view-scroll">
        {/* 위쪽 흰 영역: 제목 + 요약 카드 + 필터 탭 (REQ-ELV-007) */}
        <div className="elev-head elevator-header">
          <div className="elev-title-row">
            <h2 className="view-title">엘리베이터 현황</h2>
            <span id="elevUpdated" className="elev-updated"></span>
          </div>
          <div id="elevatorSummary" className="summary-grid"></div>
        </div>
        {/* 상단 고정 필터 탭: 전체역 / 고장·점검 / 환승역 / 호선 ▼ (REQ-ELV-001, REQ-ELV-006) */}
        <div id="elevatorFilter" className="filter-tabs" role="toolbar" aria-label="역 목록 거르기"></div>
        <div id="elevatorList" className="station-list"></div>
      </div>
    </section>
  )
}
