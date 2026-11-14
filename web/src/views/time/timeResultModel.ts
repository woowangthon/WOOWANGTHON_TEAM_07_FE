/* eslint-disable @typescript-eslint/no-explicit-any -- legacy JS result shapes */
import { showTime } from '../../lib/time'
import { getStation, safe, yeok } from '../../lib/stations'
export interface WarningModel { w: any; routeHtml: string | null }
export interface ResultModel {
  r: any
  originId: string
  destId: string
  arriveBy: string | null
  warnings: WarningModel[]
  graphicHtml: string | null
}

export function accessibleRouteHtml(stationId: string, originId?: string, destId?: string): string {
  const context: Record<string, unknown> = { affectedStationId: stationId, stationName: yeok(stationId) }
  if (originId !== undefined) context.originStationId = originId
  if (destId !== undefined) context.destinationStationId = destId
  const es = window.ElevatorService
  const snapshot = es && es.getAccessibleRouteSnapshot ? safe('getAccessibleRouteSnapshot', () => es.getAccessibleRouteSnapshot(context)) : null
  return window.AccessibleRouteView
    ? window.AccessibleRouteView.render(snapshot, context)
    : '<div class="alt-box">접근 가능한 이동 경로는 확인이 필요해요. 역무원에게 확인해 주세요.</div>'
}

/** 결과 데이터 → 화면 모델. legacy HTML 문자열은 여기서 한 번만 만든다(원본과 같은 시점). */
export function buildResultModel(r: any, originId: string, destId: string, arriveBy: string | null): ResultModel {
  const warnings: WarningModel[] = (r.elevatorWarnings || []).map((w: any) => ({
    w,
    routeHtml: !r.live || getStation(w.stationId) ? accessibleRouteHtml(w.stationId, originId, destId) : null,
  }))
  const graphicHtml = window.DepartureGraphic
    ? window.DepartureGraphic.render({ departureTime: showTime(r.leaveAt), boardingTime: showTime(r.boardAt), stationName: yeok(originId) })
    : null
  return { r, originId, destId, arriveBy, warnings, graphicHtml }
}

export function liveErrorMessage(e: any): string {
  const code = e && e.code
  if (code === 'UNMAPPED_STATION') return yeok(e.slug) + '은 서버 역 목록과 연결되지 않아 계산할 수 없어요. 다른 역을 골라 주세요.'
  if (code === 'SAME_STATION' || (e && e.status === 422 && code === 'VALIDATION_ERROR' && /같/.test(e.message || ''))) return '출발역과 도착역이 같아요. 다른 역을 골라 주세요.'
  if (e && e.status === 404) return '경로를 찾지 못했습니다. 다른 역 조합으로 다시 시도해 주세요.'
  if (code === 'NETWORK' || code === 'TIMEOUT') return '서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'
  if (code === 'BAD_TIME' || code === 'VALIDATION_ERROR') return '입력을 확인해 주세요. ' + (e.message || '')
  return '출발 시각을 계산하지 못했어요. ' + ((e && e.message) || '')
}
