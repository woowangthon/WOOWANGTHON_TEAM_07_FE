// 출발 시각 계산 탭(#view-time). 1단계는 정적 마크업만 둔다(폼 동작·결과는 2단계, app.js initTimeTab/submitTime).
// openTime()이 남긴 요청은 useApp().pendingTime으로 받는다(AppContext의 TimeRequest 주석 참고).
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'

export function TimeView() {
  const { currentTab } = useApp()
  return (
    <section id="view-time" className={'view' + (currentTab === 'time' ? ' active' : '')} data-view="time">
      <div className="view-scroll">
        {/* 제목은 화면에서 없애고 화면 읽기용으로만 남긴다 (REQ-TIME-005) */}
        <h2 className="sr-only">출발 시각 계산</h2>
        <form id="timeForm" className="card time-form" onSubmit={(e) => e.preventDefault()}>
          {/* 계산 방식 고르기 (REQ-TIME-002). 고른 값은 숨은 #modeNow에 둔다 */}
          <div id="timeMode" className="seg" role="radiogroup" aria-label="계산 방식">
            <button type="button" className="seg-btn" role="radio" aria-checked="true" data-mode="arrive">도착 시각 맞추기</button>
            <button type="button" className="seg-btn" role="radio" aria-checked="false" data-mode="now">지금 출발</button>
          </div>
          <input id="modeNow" type="checkbox" hidden />
          {/* 출발역·도착역 검색. 선택한 역 ID는 숨은 select에 보관한다. */}
          <div className="form-row station-pair">
            <div className="form-field">
              <label id="originLabel" className="form-label" htmlFor="originSearch">출발역</label>
              <div className="station-combo" id="originCombo">
                <input id="originSearch" type="search" className="station-combo-input"
                  placeholder="역 이름 검색" autoComplete="off" role="combobox"
                  aria-expanded="false" aria-controls="originResults" aria-autocomplete="list" />
                <div id="originResults" className="station-combo-results" role="listbox" aria-label="출발역 검색 결과" hidden></div>
                <select id="originSelect" aria-label="선택한 출발역" hidden></select>
              </div>
            </div>
            <button id="swapBtn" className="icon-btn swap-btn" type="button" aria-label="출발/도착 바꾸기"><Icon name="sync_alt" size="lg" /></button>
            <div className="form-field">
              <label id="destLabel" className="form-label" htmlFor="destSearch">도착역</label>
              <div className="station-combo" id="destCombo">
                <input id="destSearch" type="search" className="station-combo-input"
                  placeholder="역 이름 검색" autoComplete="off" role="combobox"
                  aria-expanded="false" aria-controls="destResults" aria-autocomplete="list" />
                <div id="destResults" className="station-combo-results" role="listbox" aria-label="도착역 검색 결과" hidden></div>
                <select id="destSelect" aria-label="선택한 도착역" hidden></select>
              </div>
            </div>
          </div>
          <div className="form-row time-row">
            <div className="form-field">
              <span id="arriveByLabel" className="form-label">도착 희망 시각</span>
              <div className="time-picker" role="group" aria-labelledby="arriveByLabel">
                <select id="arriveAmpm" aria-label="오전 오후"><option value="오전">오전</option><option value="오후">오후</option></select>
                <select id="arriveHour" aria-label="시"></select>
                <span className="time-picker-sep" aria-hidden="true">:</span>
                <select id="arriveMin" aria-label="분"></select>
              </div>
              <input id="arriveBy" type="hidden" defaultValue="15:00" />
            </div>
          </div>
          <button className="btn btn-primary btn-block btn-main" type="submit">출발 시각 계산하기</button>
        </form>
        <div id="timeResult"></div>
      </div>
    </section>
  )
}
