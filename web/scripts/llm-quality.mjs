// 표기 차이를 허용하되 시각 값은 정확히 비교한다.
export function containsTime(text, expected) {
  const times = []
  for (const match of text.matchAll(/(?<!\d)(?:오전|오후)?\s*\d{1,2}\s*(?::|시)\s*\d{1,2}\s*분?(?!\d)/g)) {
    const parts = match[0].match(/(?:(오전|오후)\s*)?(\d{1,2})\s*(?::|시)\s*(\d{1,2})/)
    let hour = Number(parts[2])
    const minute = Number(parts[3])
    if (parts[1] && (hour < 1 || hour > 12)) continue
    if (parts[1]) hour = hour % 12 + (parts[1] === '오후' ? 12 : 0)
    if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) times.push(String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0'))
  }
  return times.includes(expected)
}
