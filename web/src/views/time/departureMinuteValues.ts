export const minuteFields = [
  { key: 'walkToStationMinutes', label: '출발 장소에서 역까지', hint: '출발 장소에서 출발역 입구까지 이동하는 시간', initial: '7', max: 120 },
  { key: 'stationEntryMinutes', label: '출발역 안에서 승강장까지', hint: '엘리베이터 대기와 승강장까지 이동하는 시간', initial: '3', max: 120 },
  { key: 'exitWalkMinutes', label: '도착역에서 목적지까지', hint: '열차에서 내린 뒤 출구를 거쳐 최종 목적지까지 이동하는 시간', initial: '3', max: 120 },
  { key: 'bufferMinutes', label: '추가 여유 시간', hint: '잠깐 쉬거나 탑승을 준비할 시간. 탑승 전에 한 번 더해요.', initial: '5', max: 240 },
] as const

export type MinuteKey = typeof minuteFields[number]['key']
export type MinuteDraft = Record<MinuteKey, string>
export type MinuteValues = Record<MinuteKey, number>
export const defaultMinuteDraft = (): MinuteDraft => ({ walkToStationMinutes: '7', stationEntryMinutes: '3', exitWalkMinutes: '3', bufferMinutes: '5' })

export function minuteError(value: string, max: number) {
  if (!value.trim()) return '시간을 입력해 주세요. 이동이 없으면 0을 입력해요.'
  if (!/^\d+$/.test(value) || Number(value) > max) return `0~${max} 사이의 정수로 입력해 주세요.`
  return ''
}
