// 엘리베이터 탭의 "내 노선 필터"(custom filters). 원본 app.js의 elevCustomFilters + sessionStorage 처리.
// 탭(ElevatorView)과 필터 시트(FilterSheet)가 같이 쓰므로 모듈 저장소로 둔다.
import { useSyncExternalStore } from 'react'
import { Auth } from '../../legacy/services'

export const CUSTOM_FILTER_KEY = 'elevSubway.elevFilters.v1'

export type MockLines = Record<string, { name: string; color: string }>
export const mockLines = (): MockLines => ((window.MOCK as unknown as { lines?: MockLines } | undefined)?.lines) || {}

export function hasSession(): boolean {
  const a = Auth()
  return !!(a && a.getSession())
}

export function loadCustomFilters(): string[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CUSTOM_FILTER_KEY) || '[]')
    const lines = mockLines()
    return Array.isArray(saved) ? saved.filter((id, i) => typeof id === 'string' && !!lines[id] && saved.indexOf(id) === i) : []
  } catch { return [] }
}

function saveCustomFilters(filters: string[]) {
  try { sessionStorage.setItem(CUSTOM_FILTER_KEY, JSON.stringify(filters)) } catch { /* 저장 실패는 무시 */ }
}

let filters: string[] = []
let authVersion = 0
let attached = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function same(a: string[], b: string[]) { return a.length === b.length && a.every((v, i) => v === b[i]) }

/** 로그인 상태에 맞춰 필터를 다시 맞춘다. 로그아웃이면 비우고(있었으면 저장도 비움), 로그인이면 저장된 값을 읽는다. */
function refresh() {
  let next: string[]
  if (!hasSession()) {
    next = []
    if (filters.length > 0) saveCustomFilters([])
  } else {
    next = loadCustomFilters()
  }
  if (!same(filters, next)) filters = next
  authVersion += 1
  emit()
}

function attach() {
  if (attached) return
  attached = true
  const a = Auth()
  if (a && a.subscribe) a.subscribe(() => refresh())
  refresh()
}

function subscribe(cb: () => void) {
  attach()
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

export function getCustomFilters(): string[] { return filters }

export function setCustomFilters(next: string[]) {
  filters = next
  saveCustomFilters(next)
  emit()
}

export function useCustomFilters(): string[] {
  return useSyncExternalStore(subscribe, () => filters, () => filters)
}

/** 로그인 여부(인증이 바뀌면 다시 렌더링). */
export function useSignedIn(): boolean {
  useSyncExternalStore(subscribe, () => authVersion, () => authVersion)
  return hasSession()
}
