// AI 답변 본문을 안전하게 렌더링한다 (#86).
// 지원: 문단(빈 줄), 제목(#, ##, ###), 목록(-, *, 1.), **굵게**, 엘리베이터 상태 단어(색 + 글자).
// HTML 문자열을 만들거나 dangerouslySetInnerHTML을 쓰지 않는다. 모든 텍스트는 React 텍스트 노드로 들어가므로
// 서버나 사용자 입력의 <script>·<img onerror> 등은 글자 그대로 보인다.
import { Fragment, type ReactNode } from 'react'

const STATUS_WORDS: Array<{ word: string; cls: string }> = [
  { word: '이용 불가', cls: 'status-bad' },
  { word: '일부 운행', cls: 'status-warn' },
  { word: '확인 필요', cls: 'status-unknown' },
  { word: '정상', cls: 'status-ok' },
]

/** 굵게(**…**)와 상태 단어를 텍스트 노드·span으로 나눈다. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g)
  boldParts.forEach((part, i) => {
    const key = `${keyBase}-b${i}`
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      out.push(<strong key={key}>{highlightStatus(part.slice(2, -2), key)}</strong>)
    } else if (part) {
      out.push(<Fragment key={key}>{highlightStatus(part, key)}</Fragment>)
    }
  })
  return out
}

function highlightStatus(text: string, keyBase: string): ReactNode[] {
  const pattern = new RegExp(`(${STATUS_WORDS.map((s) => s.word).join('|')})`, 'g')
  return text.split(pattern).map((part, i) => {
    const hit = STATUS_WORDS.find((s) => s.word === part)
    return hit
      ? <span key={`${keyBase}-s${i}`} className={`answer-status ${hit.cls}`}>{part}</span>
      : <Fragment key={`${keyBase}-t${i}`}>{part}</Fragment>
  })
}

type Block =
  | { kind: 'p'; lines: string[] }
  | { kind: 'h'; level: number; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }

function parse(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  for (const raw of lines) {
    const line = raw.trimEnd()
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line)
    const last = blocks[blocks.length - 1]
    if (!line.trim()) { blocks.push({ kind: 'p', lines: [] }); continue }
    if (heading) { blocks.push({ kind: 'h', level: heading[1].length, text: heading[2] }); continue }
    if (bullet) {
      if (last && last.kind === 'ul') last.items.push(bullet[1])
      else blocks.push({ kind: 'ul', items: [bullet[1]] })
      continue
    }
    if (numbered) {
      if (last && last.kind === 'ol') last.items.push(numbered[1])
      else blocks.push({ kind: 'ol', items: [numbered[1]] })
      continue
    }
    if (last && last.kind === 'p') last.lines.push(line)
    else blocks.push({ kind: 'p', lines: [line] })
  }
  return blocks.filter((b) => b.kind !== 'p' || b.lines.length > 0)
}

export function AnswerText({ text }: { text: string }) {
  const blocks = parse(String(text || ''))
  return (
    <div className="answer-text">
      {blocks.map((b, i) => {
        const key = `b${i}`
        if (b.kind === 'h') {
          const Tag = b.level === 1 ? 'h3' : 'h4'
          return <Tag key={key} className="answer-heading">{inline(b.text, key)}</Tag>
        }
        if (b.kind === 'ul' || b.kind === 'ol') {
          const List: 'ul' | 'ol' = b.kind
          return <List key={key} className="answer-list">{b.items.map((item, j) => <li key={j}>{inline(item, `${key}-${j}`)}</li>)}</List>
        }
        if (b.kind !== 'p') return null
        return (
          <p key={key} className="answer-para">
            {b.lines.map((line, j) => (
              <Fragment key={j}>{j > 0 && <br />}{inline(line, `${key}-${j}`)}</Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}
