// 화면의 시각은 TimeCalculator의 표기 함수로만 바꾼다. (REQ-DS-009)
import { escapeHtml } from './html'

export function pad2(n: number): string { return (n < 10 ? '0' : '') + n }

export function showTime(hhmm: string | null | undefined): string {
  const tc = window.TimeCalculator
  return tc && tc.displayTime ? tc.displayTime(hhmm as string) : (hhmm == null ? '' : String(hhmm))
}

export function showTimesIn(text: string | null | undefined): string {
  const tc = window.TimeCalculator
  return tc && tc.displayTimesInText ? tc.displayTimesInText(text as string) : (text == null ? '' : String(text))
}

/** 큰 출발 시각 HTML: 작은 "오후" + 큰 "8:53" (원본 bigTimeHtml). 컴포넌트에서는 bigTimeParts를 쓴다. */
export function bigTime(hhmm: string): string {
  const p = bigTimeParts(hhmm)
  return p ? '<span class="big-time-ampm">' + p.ampm + ' </span>' + escapeHtml(p.time) : escapeHtml(hhmm)
}

/** TimeCalculator.displayParts 결과({ampm, time}). 없으면 null. */
export function bigTimeParts(hhmm: string): { ampm: string; time: string } | null {
  const tc = window.TimeCalculator
  return tc && tc.displayParts ? tc.displayParts(hhmm) : null
}

/** BE가 가져온 시각(ISO, KST 표기 그대로)을 "11/15 오후 2:00 기준"으로. 값이 없으면 null */
export function showBeTime(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || '')
  if (!m) return null
  return m[2] + '/' + m[3] + ' ' + showTime(m[4] + ':' + m[5]) + ' 기준'
}

export function nowHHMM(d?: Date): string {
  const t = d || new Date()
  return pad2(t.getHours()) + ':' + pad2(t.getMinutes())
}
