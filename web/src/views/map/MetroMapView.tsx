// #mapContainer에 legacy MetroMap을 붙인다.
// StrictMode(개발)는 effect를 init → cleanup → init 순으로 돌린다. MetroMap.init은 이미 켜져 있으면 스스로 destroy하고,
// destroy는 ResizeObserver·ElevatorService 구독·svg를 모두 정리하므로(metro-map.js) 다시 init해도 안전하다. 그래서 별도 ref 가드는 두지 않는다.
// 지도는 자체 ElevatorService.subscribe로 색을 다시 칠하므로 여기서 구독하지 않는다.
import { useEffect } from 'react'
import { useApp } from '../../app/context'
import { mapCall } from '../../lib/stations'

export function MetroMapView() {
  const { openStation, getSheet, setSheetState } = useApp()

  useEffect(() => {
    const map = window.MetroMap
    if (!map || !map.init) { console.error('[App] MetroMap 사용 불가'); return }
    const container = document.getElementById('mapContainer')
    if (!container) return
    map.init(container, {
      onStationClick: (id: string) => openStation(id),
      // 시트가 펼쳐져 있으면 요약으로 내린다. 닫지는 않는다 (REQ-COM-004)
      onMapClick: () => { const s = getSheet(); if (s.open && s.state === 'full') setSheetState('peek') },
    })
    return () => { mapCall('destroy') }
  }, [openStation, getSheet, setSheetState])

  return <div id="mapContainer" className="map-container"></div>
}
