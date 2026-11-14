import { useSyncExternalStore } from 'react'
import { ES } from '../legacy/services'

// ElevatorService는 내부 상태가 바뀔 때 subscribe 콜백만 부른다. 버전 숫자를 올려 React가 다시 그리게 한다.
let version = 0
const listeners = new Set<() => void>()
let attached = false

function attach() {
  if (attached) return
  attached = true
  ES().subscribe(() => {
    version += 1
    listeners.forEach((l) => l())
  })
}

function subscribe(cb: () => void) {
  attach()
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

/** ElevatorService 데이터가 바뀔 때마다 증가하는 값. 이 값을 구독하면 서비스 변경 시 다시 렌더링된다. */
export function useElevatorVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => version)
}
