import type { Station } from '../legacy/globals'
import { allStations, koCompare, safe } from './stations'

export function normalizeName(s: unknown): string {
  return String(s || '').replace(/\s+/g, '').replace(/역$/, '').toLowerCase()
}

/** 역 검색(헤더 검색과 출발계산 역 고르기 등이 같이 쓴다). 최대 8개. */
export function searchStations(q: string): Station[] {
  const nq = normalizeName(q)
  if (!nq) return []
  const list = allStations().filter((s) => normalizeName(s.name).indexOf(nq) >= 0)
  list.sort((a, b) => {
    const as = normalizeName(a.name).indexOf(nq) === 0 ? 0 : 1
    const bs = normalizeName(b.name).indexOf(nq) === 0 ? 0 : 1
    if (as !== bs) return as - bs
    return koCompare(a.name, b.name)
  })
  // 별칭(홍대, 건대 등) 매칭 보강
  const es = window.ElevatorService
  if (es && es.findStationByName) {
    const alias = safe('findStationByName', () => es.findStationByName(q))
    if (alias && !list.some((s) => s.id === alias.id)) list.unshift(alias)
  }
  return list.slice(0, 8)
}

