// 헤더 역 검색(#searchInput/#searchResults). app.js initSearch 그대로: 이름 정규화, 접두 일치 먼저, 별칭 보강, 8개, Enter는 첫 결과.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp } from './context'
import { LineBadges } from '../components/LineBadge'
import { StatusPill } from '../components/StatusPill'
import { useElevatorVersion } from '../hooks/useElevatorService'
import { searchStations } from '../lib/search'
import { stationStatus, yeok } from '../lib/stations'

/** .search-box(아이콘, 입력, children = 오른쪽 버튼)와 #searchResults. 헤더 안에 놓는다. */
export function HeaderSearch({ children }: { children?: ReactNode }) {
  const { openStation, subscribeTabChange } = useApp()
  useElevatorVersion() // 상태 알약이 서비스 변경을 따라가도록
  const [query, setQuery] = useState('')
  const [show, setShow] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const q = query.trim()
  const results = useMemo(() => (q ? searchStations(q) : []), [q])

  // 탭을 바꾸거나 역을 열면 결과를 닫는다(원본 switchTab의 hideSearch)
  useEffect(() => subscribeTabChange(() => setShow(false)), [subscribeTabChange])
  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current) }, [])

  const choose = (id: string) => {
    setQuery('')
    setShow(false)
    inputRef.current?.blur()
    openStation(id)
  }

  return (
    <>
      <div className="search-box">
        <span className="search-icon ms" aria-hidden="true">search</span>
        <input
          id="searchInput"
          ref={inputRef}
          type="search"
          placeholder="역 이름 검색 (예: 강남)"
          autoComplete="off"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShow(!!e.target.value.trim()) }}
          onFocus={() => { if (query.trim()) setShow(true) }}
          onBlur={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current)
            blurTimer.current = setTimeout(() => setShow(false), 180)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setShow(false); e.currentTarget.blur() }
            else if (e.key === 'Enter') {
              e.preventDefault()
              if (results.length) choose(results[0].id)
            }
          }}
        />
        {children}
      </div>
      {/* mousedown에서 기본 동작을 막아 blur 전에 클릭이 처리되도록 */}
      <div id="searchResults" className={'search-results' + (show && q ? ' show' : '')} onMouseDown={(e) => e.preventDefault()}>
        {q && !results.length && <div className="empty">"{q}"에 해당하는 역이 없어요</div>}
        {q && results.map((s) => (
          <div key={s.id} className="search-item" data-id={s.id} role="button" tabIndex={-1} onClick={() => choose(s.id)}>
            <span className="search-name">{yeok(s)}</span>
            <span className="search-lines"><LineBadges station={s} /></span>
            <StatusPill status={stationStatus(s.id)} />
          </div>
        ))}
      </div>
    </>
  )
}
