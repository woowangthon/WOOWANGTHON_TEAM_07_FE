// 노선도 탭(#view-map): 호선 필터 칩, 지도(MetroMap), 확대/축소 버튼, 범례.
import { useState, type CSSProperties } from 'react'
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'
import { mapCall } from '../../lib/stations'
import { MetroMapView } from './MetroMapView'

interface LineInfo { id: string; name: string; color: string }

function useLines(): LineInfo[] {
  const lines = (window.MOCK && window.MOCK.lines) || {}
  return Object.keys(lines).map((id) => ({ id, name: lines[id].name, color: lines[id].color }))
}

function LineFilter() {
  const lines = useLines()
  const [activeLine, setActiveLine] = useState<string | null>(null)

  const pick = (lineId: string | null) => {
    const id = lineId && lineId === activeLine ? null : lineId // 같은 노선 다시 누르면 전체
    setActiveLine(id)
    mapCall('setLineFilter', id)
  }

  return (
    <div id="lineFilter" className="line-filter">
      <button type="button" className={'chip' + (activeLine === null ? ' active' : '')} data-line="" onClick={() => pick(null)}>전체</button>
      {lines.map((l) => (
        <button
          key={l.id}
          type="button"
          className={'chip' + (activeLine === l.id ? ' active' : '')}
          data-line={l.id}
          style={{ '--line-color': l.color } as CSSProperties}
          onClick={() => pick(l.id)}
        ><span className="chip-dot" style={{ background: l.color }}></span>{l.name}</button>
      ))}
    </div>
  )
}

export function MapView() {
  const { currentTab } = useApp()
  return (
    <section id="view-map" className={'view' + (currentTab === 'map' ? ' active' : '')} data-view="map">
      <LineFilter />
      <MetroMapView />
      <div className="map-controls">
        <button id="zoomIn" className="icon-btn" type="button" aria-label="확대" onClick={() => mapCall('zoomIn')}><Icon name="add" size="lg" /></button>
        <button id="zoomOut" className="icon-btn" type="button" aria-label="축소" onClick={() => mapCall('zoomOut')}><Icon name="remove" size="lg" /></button>
        <button id="zoomReset" className="icon-btn" type="button" aria-label="전체 보기" onClick={() => mapCall('resetView')}><Icon name="fit_screen" size="lg" /></button>
      </div>
      <div className="map-legend">
        <span><i className="lg-node ok"></i>정상</span>
        <span><i className="lg-node warn"><Icon name="error" /></i>일부 운행</span>
        <span><i className="lg-node bad"><Icon name="cancel" /></i>이용 불가</span>
        <span><i className="lg-node unknown"></i>정보 없음</span>
      </div>
    </section>
  )
}
