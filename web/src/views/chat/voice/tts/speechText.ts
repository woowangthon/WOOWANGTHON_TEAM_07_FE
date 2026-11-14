const HOURS = ['열두', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한']
const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
function minute(value: number) {
  return value < 10 ? DIGITS[value] : `${value >= 20 ? DIGITS[Math.floor(value / 10)] : ''}십${DIGITS[value % 10]}`
}

/** HTML 파싱 없이 듣기용 평문을 만든다. 경고와 갱신 시각을 생략하지 않는다. */
export function toSpeechText(text: string): string {
  return text
    .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
    .replace(/\[([^\]]+)\]\([^\s)]+\)/g, '$1')
    .replace(/^\s{0,3}(?:#{1,6}\s+|[-*+]\s+)/gm, '')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
    .replace(/\*([^*\n]+)\*|_([^_\n]+)_|~~([^~]+)~~/g, '$1$2$3')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)(Z|([+-])(\d{2}):(\d{2}))/g,
      (_match, date: string, time: string, zone: string, sign: string, hours: string, minutes: string) =>
        `${date} ${time} ${zone === 'Z' ? 'UTC 기준' : `UTC ${sign === '+' ? '더하기' : '빼기'} ${Number(hours)} 시간 ${Number(minutes)} 분 기준`}`)
    .replace(/(?:(오전|오후)\s*)?\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
      (_match, period: string | undefined, hours: string, minutes: string, seconds: string | undefined) => {
        const hour = Number(hours)
        const prefix = period || (hour < 12 ? '오전' : '오후')
        const secondPart = seconds && Number(seconds) ? ` ${minute(Number(seconds))} 초` : ''
        return `${prefix} ${HOURS[hour % 12]} 시${Number(minutes) ? ` ${minute(Number(minutes))} 분` : secondPart ? '' : ' 정각'}${secondPart}`
      })
    .replace(/↔/g, ' 양방향 ')
    .replace(/→|➡/g, ' 에서 다음으로 ')
    .replace(/←/g, ' 반대 방향 ')
    .replace(/[·•]/g, ', ')
    .replace(/\p{Extended_Pictographic}|\p{Regional_Indicator}|\uFE0F|\u200D|\u20E3/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}
