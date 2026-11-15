// 로그인 사용자의 예상 이동 시간 저장 (#87). 마이페이지에서 저장하고 출발계산이 읽는다.
// 서버 저장 API가 없으므로 이 기기 localStorage에 둔다. 다시 로그인해도 같은 기기에서는 유지된다.
// 비로그인 사용자는 저장값이 있어도 기본값을 쓴다.
import { useMemo, useSyncExternalStore } from 'react'
import { useSession } from '../account/authStore'
import { defaultMinuteDraft, minuteError, minuteFields, type MinuteDraft } from './departureMinuteValues'

export const PERSONAL_MINUTES_KEY = 'elevSubway.departureMinutes.v1'

const listeners = new Set<() => void>()
function subscribe(fn: () => void) {
  listeners.add(fn)
  const onStorage = () => fn()
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage) }
}
function notify() { listeners.forEach((fn) => fn()) }

/** useSyncExternalStore는 문자열 스냅샷만 안정적으로 비교하므로 원문을 그대로 돌려준다. */
function rawSnapshot(): string {
  try { return localStorage.getItem(PERSONAL_MINUTES_KEY) || '' } catch { return '' }
}

/** 저장값을 검증해 입력 칸 형식(문자열)으로 바꾼다. 하나라도 잘못되면 저장값 없음으로 본다. */
export function parsePersonalMinutes(raw: string): MinuteDraft | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Record<string, unknown> | null
    if (!value || value.version !== 1) return null
    const draft = {} as MinuteDraft
    for (const field of minuteFields) {
      const text = String(value[field.key] ?? '')
      if (minuteError(text, field.max)) return null
      draft[field.key] = text
    }
    return draft
  } catch { return null }
}

export function savePersonalMinutes(draft: MinuteDraft): boolean {
  const data: Record<string, number | string> = { version: 1 }
  for (const field of minuteFields) {
    if (minuteError(draft[field.key], field.max)) return false
    data[field.key] = Number(draft[field.key])
  }
  try {
    localStorage.setItem(PERSONAL_MINUTES_KEY, JSON.stringify(data))
  } catch { return false }
  notify()
  return true
}

export function clearPersonalMinutes() {
  try { localStorage.removeItem(PERSONAL_MINUTES_KEY) } catch { /* 저장소 불가 */ }
  notify()
}

/**
 * 계산에 쓸 예상 이동 시간. 로그인 + 저장값이 있으면 저장값, 아니면 기본값.
 * key는 값이 바뀌었는지 비교할 때 쓴다.
 */
export function usePersonalMinutes(): { signedIn: boolean; saved: MinuteDraft | null; draft: MinuteDraft; key: string } {
  const session = useSession()
  const signedIn = !!(session && typeof session === 'object')
  const raw = useSyncExternalStore(subscribe, rawSnapshot, rawSnapshot)
  const saved = useMemo(() => parsePersonalMinutes(raw), [raw])
  const applied = signedIn ? saved : null
  const draft = useMemo(() => applied ?? defaultMinuteDraft(), [applied])
  return { signedIn, saved, draft, key: JSON.stringify(draft) }
}
