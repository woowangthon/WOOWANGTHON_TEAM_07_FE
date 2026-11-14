// 즐겨찾기 장소 상세 시트(app.js openFavDetail). payload.fav에 즐겨찾기 항목이 들어 있다.
import { useEffect, useRef, useState } from 'react'
import type { SheetContentProps } from '../app/context'
import { useApp } from '../app/context'
import { Icon } from '../components/Icon'
import type { Favorite } from '../views/account/favorites'

export function FavDetailSheet({ sheet }: SheetContentProps) {
  const { closeSheet } = useApp()
  const fav = sheet.payload.fav as Favorite | undefined
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  if (!fav) return null
  const name = fav.alias || fav.placeName

  const play = () => {
    // 원본: running 클래스를 뗐다 다시 붙여 애니메이션을 처음부터 시작 → 3.2초 뒤 해제
    const anim = document.getElementById('subwayDemoAnim')
    if (anim) { anim.classList.remove('running'); void anim.offsetWidth }
    setRunning(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setRunning(false), 3200)
  }

  return (
    <>
      <div className="sheet-header">
        <div className="sheet-title"><Icon name="star" />{name}</div>
        <div className="card-sub">즐겨찾기 장소 상세</div>
      </div>
      <div className="sheet-section">
        <div className="section-label">주변 지하철역 정보</div>
        <div className="alt-box fav-detail-notice">
          <div className="alt-title"><Icon name="info" />위치 정보 미연결</div>
          <div className="alt-tip">주변 역과 거리는 확인이 필요해요. 역의 엘리베이터 정보를 직접 확인해 주세요.</div>
        </div>
      </div>
      <div className="sheet-section">
        <div className="section-label">지하철 이동 (데모)</div>
        <div className={'subway-demo-anim' + (running ? ' running' : '')} id="subwayDemoAnim" aria-label="지하철 이동 데모">
          <div className="subway-track"><span className="subway-train" aria-hidden="true"><Icon name="subway" /></span></div>
          <p className="subway-demo-label">시연용 애니메이션 · 실제 열차 위치가 아닙니다</p>
          <button type="button" className="btn btn-sm btn-ghost" id="subwayDemoPlay" disabled={running} onClick={play}><Icon name="play_arrow" />데모 보기</button>
        </div>
      </div>
      <div className="sheet-section">
        <button type="button" className="btn btn-ghost btn-block" data-act="close-sheet" onClick={closeSheet}>닫기</button>
      </div>
    </>
  )
}
