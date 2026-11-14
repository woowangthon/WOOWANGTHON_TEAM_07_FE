// AuthService.subscribe는 해제 함수가 없다. StrictMode가 effect를 두 번 돌려도 구독이 쌓이지 않도록
// 모듈에서 한 번만 구독하고, React에는 useSyncExternalStore로 전달한다.
import { useSyncExternalStore } from 'react'
import { Auth } from '../../legacy/services'
import type { AuthSession } from '../../legacy/globals'

const listeners = new Set<() => void>()
let version = 0
let subscribed = false

function notify() {
  version += 1
  listeners.forEach((fn) => fn())
}

function ensureSubscribed() {
  if (subscribed) return
  const auth = Auth()
  if (!auth) return
  subscribed = true
  auth.subscribe(notify)
}

/** 세션 객체를 제자리에서 고친 뒤(데모 이름 변경) 다시 그리게 한다. */
export function touchAuth() { notify() }

function subscribe(fn: () => void) {
  ensureSubscribed()
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** null = 확인 중, false = 비로그인, object = 로그인 */
export function useSession(): AuthSession | null | false {
  useSyncExternalStore(subscribe, () => version)
  const auth = Auth()
  return auth ? auth.getSession() : false
}
