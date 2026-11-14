import type { ChatResponse } from '../../legacy/globals'
import { apiMode } from '../../lib/stations'

/** API 답변은 평문만 사용한다. 로컬 mock 카드의 위치·고장 사유·주의 문구도 듣기에 포함한다. */
export function responseSpeechText(response: ChatResponse): string {
  if (!response.html || apiMode()) return response.text || ''
  const card = document.createElement('div')
  card.innerHTML = response.html
  card.querySelectorAll('script,style,button,a,[aria-hidden="true"],.ms').forEach((node) => node.remove())
  card.querySelectorAll('.line-badge').forEach((node) => {
    const label = node.textContent?.trim() || ''
    if (/^[1-8]$/.test(label)) node.textContent = `${label}호선`
  })
  card.querySelectorAll('div,p,li,br').forEach((node) => node.append(document.createTextNode('\n')))
  const summary = (card.textContent || '').replace(/\s+/g, ' ').trim()
  return [response.text, summary].filter(Boolean).join('\n')
}
