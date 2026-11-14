/* eslint-disable @typescript-eslint/no-explicit-any -- window.MOCK는 타입 없는 legacy 경계 */
// app.js의 역·노선·상태 도우미. 동작은 원본과 같게 유지한다(서비스가 없거나 실패해도 죽지 않고 기본값).
import type { Elevator, Line, MetroMapApi, Station } from '../legacy/globals'

export function safe<T>(label: string, fn: () => T): T | undefined {
  try { return fn() } catch (e) { console.error('[App] ' + label + ' 실패:', e); return undefined }
}

const mockData = (): Record<string, any> => window.MOCK || {}

export function getStation(id?: string | null): Station | null {
  if (!id) return null
  const es = window.ElevatorService
  if (es && es.getStation) {
    const s = safe('getStation', () => es.getStation(id))
    if (s) return s
  }
  const st = mockData().stations
  return (st && st[id]) || null
}

export function stationName(idOrStation?: string | { name?: string; id?: string } | null): string {
  if (!idOrStation) return ''
  if (typeof idOrStation === 'object') return idOrStation.name || idOrStation.id || ''
  const s = getStation(idOrStation)
  return s ? s.name : String(idOrStation)
}

/** "강남" → "강남역", "서울역" → "서울역" (중복 접미사 방지) */
export function yeok(idOrStation?: string | { name?: string; id?: string } | null): string {
  const n = stationName(idOrStation)
  return /역$/.test(n) ? n : n + '역'
}

export function getLine(lineId: string): Line {
  const es = window.ElevatorService
  let l: Line | null | undefined = null
  if (es && es.getLine) l = safe('getLine', () => es.getLine(lineId))
  if (!l) { const lines = mockData().lines; l = lines && lines[lineId] }
  return l || { id: lineId, name: String(lineId), short: String(lineId), color: '#9CA3AF', segments: [], paths: [] }
}

export const STATUS_CLASS: Record<string, string> = { AVAILABLE: 'ok', PARTIAL: 'warn', UNAVAILABLE: 'bad', UNKNOWN: 'unknown' }

/** 상태 이름은 elevator-service.js에서 가져온다. (REQ-DS-008) */
export function statusLabel(status: string): string {
  const es = window.ElevatorService
  const l = es && es.getStatusLabel ? safe('getStatusLabel', () => es.getStatusLabel(status as never)) : null
  return l || status
}

/** 상태 모양(아이콘 이름)은 elevator-service.js에서 가져온다. (REQ-DS-003) */
export function statusIcon(status: string): string {
  const es = window.ElevatorService
  return (es && es.getStatusIcon ? safe('getStatusIcon', () => es.getStatusIcon(status as never)) : null) || 'help'
}

export function stationStatus(id: string): string {
  const es = window.ElevatorService
  if (!es || !es.getStationStatus) return 'UNKNOWN'
  return safe('getStationStatus', () => es.getStationStatus(id)) || 'UNKNOWN'
}

export function getElevators(id: string): Elevator[] {
  const es = window.ElevatorService
  if (!es || !es.getElevators) return []
  return safe('getElevators', () => es.getElevators(id)) || []
}

export function hasData(id: string): boolean {
  const es = window.ElevatorService
  if (!es) return false
  if (es.hasElevatorData) return !!safe('hasElevatorData', () => es.hasElevatorData(id))
  return getElevators(id).length > 0
}

export function allStations(): Station[] {
  const es = window.ElevatorService
  let list: Station[] | null | undefined = es && es.getAllStations ? safe('getAllStations', () => es.getAllStations()) : null
  if (!list) {
    const st = mockData().stations || {}
    list = Object.keys(st).map((k) => st[k])
  }
  return list.slice()
}

export function koCompare(a: unknown, b: unknown): number { return String(a).localeCompare(String(b), 'ko') }

/** 정보 없음(UNKNOWN)은 멈춘 것도 정상도 아니다 */
export function isDown(elev?: { status?: string } | null): boolean {
  return !!elev && elev.status !== 'AVAILABLE' && elev.status !== 'UNKNOWN'
}

export const ELEV_STATUS_TEXT: Record<string, string> = { AVAILABLE: '정상', UNAVAILABLE: '고장', MAINTENANCE: '점검 중', UNKNOWN: '정보 없음' }
export const ELEV_TYPE_TEXT: Record<string, string> = { exit: '출구', platform: '승강장', transfer: '환승' }

/** 실데이터(BE) 모드 여부. 목업 모드에서는 false */
export function apiMode(): boolean {
  const es = window.ElevatorService
  return !!(es && es.isLive && es.isLive())
}

export function liveState(): { live: boolean; phase: string; error: string | null } {
  const es = window.ElevatorService
  return es && es.getLiveState ? es.getLiveState() : { live: false, phase: 'ready', error: null }
}

/** window.MetroMap 메서드를 안전하게 부른다(없거나 던져도 앱은 계속). */
export function mapCall<K extends keyof MetroMapApi>(method: K, ...args: Parameters<MetroMapApi[K]>): unknown {
  const m = window.MetroMap as unknown as Record<string, ((...a: unknown[]) => unknown) | undefined> | undefined
  const fn = m && m[method]
  if (typeof fn === 'function') {
    try { return fn.apply(m, args) } catch (e) { console.error('[App] MetroMap.' + String(method) + ' 실패:', e) }
  }
  return undefined
}
