// 바텀 시트 높이 계산(app.js sheetMetrics/sheetY). DOM에서 폰 프레임·헤더·요약 영역의 실제 크기를 잰다.
import type { SheetState } from './context'

export interface SheetMetrics { full: number; peek: number }

/** 시트 높이: 펼침 = 상단 검색창 아래까지, 요약 = 역 이름 + 운행 현황(+ 우회 경로 버튼) */
export function sheetMetrics(): SheetMetrics {
  const phone = document.getElementById('phone')
  const hdr = document.querySelector('.app-header')
  const pr = phone ? phone.getBoundingClientRect() : { top: 0, bottom: innerHeight, height: innerHeight }
  const hb = hdr ? hdr.getBoundingClientRect().bottom : pr.top
  const full = Math.round(pr.bottom - hb - 8)
  let peek = full
  const sum = document.querySelector<HTMLElement>('#sheetContent .sheet-summary')
  if (sum) peek = Math.min(full, Math.max(Math.round(pr.height * 0.25), sum.offsetTop + sum.offsetHeight + 16))
  return { full, peek }
}

export function sheetY(state: SheetState | null, m: SheetMetrics): number {
  return state === 'peek' ? m.full - m.peek : 0
}
