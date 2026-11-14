// 검증된 접근성 안내는 근거가 만료되면 React 상태로 철회한다.
import { useEffect, useReducer } from 'react'

function withdrawExpired(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html
  const now = Date.now()
  let next = Infinity
  let changed = false
  template.content.querySelectorAll('.accessible-route--verified[data-valid-until]').forEach((card) => {
    const expiry = Number(card.getAttribute('data-valid-until'))
    if (Number.isFinite(expiry) && expiry > now) { next = Math.min(next, expiry); return }
    const group = card.closest('.accessible-routes')
    const replacement = document.createElement('article')
    replacement.className = 'accessible-route accessible-route--missing'
    replacement.innerHTML = '<h4>경로 확인 필요</h4><p>이 경로의 접근성 근거가 만료되었어요. 최신 정보를 확인해 주세요.</p>'
    card.replaceWith(replacement)
    if (group && !group.querySelector('.accessible-route--verified')) group.querySelector('.accessible-routes-heading')?.remove()
    changed = true
  })
  return { html: changed ? template.innerHTML : html, next }
}

// HTML은 앱 내부의 이스케이프된 legacy 렌더러에서만 받는다.
export function ExpiringHtml({ html, className }: { html: string; className?: string }) {
  const [, refresh] = useReducer((n: number) => n + 1, 0)
  const rendered = withdrawExpired(html)
  useEffect(() => {
    const timer = Number.isFinite(rendered.next)
      ? setTimeout(refresh, Math.min(2147483647, Math.max(1, rendered.next - Date.now())))
      : undefined
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('pageshow', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('pageshow', refresh)
    }
  }, [html, rendered.next])
  return <div className={className} style={className ? undefined : { display: 'contents' }} dangerouslySetInnerHTML={{ __html: rendered.html }} />
}
