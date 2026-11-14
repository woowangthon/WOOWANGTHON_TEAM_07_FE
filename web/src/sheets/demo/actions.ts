import { useSyncExternalStore } from 'react'
import type { AppApi } from '../../app/context'
import { apiMode, isDown, mapCall, safe, yeok } from '../../lib/stations'

// ---- 전체화면(body.fullscreen) ----
const fsListeners = new Set<() => void>()
let fsObserver: MutationObserver | null = null
function fsSubscribe(cb: () => void) {
  fsListeners.add(cb)
  if (!fsObserver && typeof MutationObserver !== 'undefined') {
    fsObserver = new MutationObserver(() => fsListeners.forEach((l) => l()))
    fsObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  }
  return () => {
    fsListeners.delete(cb)
    if (!fsListeners.size && fsObserver) { fsObserver.disconnect(); fsObserver = null }
  }
}
const fsSnapshot = () => document.body.classList.contains('fullscreen')

export function useFullscreen(): boolean {
  return useSyncExternalStore(fsSubscribe, fsSnapshot, () => false)
}

export function toggleFullscreen() { document.body.classList.toggle('fullscreen') }

// ---- 동작 ----
type DemoApi = Pick<AppApi, 'toast' | 'openStation'>

export function runScenario(api: DemoApi, stationId: string | null | undefined) {
  if (apiMode()) return
  const es = window.ElevatorService
  if (!stationId || !es || !es.setStationBroken) return
  es.setStationBroken(stationId, true)
  api.openStation(stationId)
  api.toast(yeok(stationId) + ' 엘리베이터가 모두 고장 상태로 전환되었어요')
  mapCall('clearHighlights')
}

export function resetDemo(api: Pick<AppApi, 'toast'>) {
  if (apiMode()) return
  const es = window.ElevatorService
  if (es && es.reset) safe('ElevatorService.reset', () => es.reset())
  mapCall('clearHighlights')
  api.toast('모든 엘리베이터 상태를 초기화했어요') // 시트·패널은 ElevatorService 구독으로 다시 그려진다
}

/** 선택한 역의 가상 고장/복구 버튼 처리(원본 onDemoStationAction). */
export function demoStationAction(api: Pick<AppApi, 'toast'>, sid: string | null, act: 'demo-toggle-elev' | 'demo-station-broken', arg: string) {
  if (apiMode()) return
  const es = window.ElevatorService
  if (!sid || !es) return
  if (act === 'demo-toggle-elev') {
    if (!es.toggleElevator) return
    mapCall('clearHighlights')
    const el = es.toggleElevator(sid, arg) as unknown as { location?: string; status: string } | undefined
    api.toast(yeok(sid) + (el ? ' ' + el.location : '') + ' 엘리베이터가 ' +
      (el && isDown(el) ? '고장 상태로 전환되었어요' : '복구되었어요'))
    return
  }
  if (!es.setStationBroken) return
  const broken = arg === '1'
  es.setStationBroken(sid, broken)
  api.toast(yeok(sid) + ' 엘리베이터가 ' + (broken ? '모두 고장 상태로 전환되었어요' : '모두 복구되었어요'))
  mapCall('clearHighlights')
}

export function demoScenarios(): Array<{ id?: string; stationId?: string; label: string }> {
  return (window.MOCK && window.MOCK.demoScenarios) || []
}
