// 역 검색 콤보박스(원본 app.js initStationCombo). 선택한 역 ID는 부모가 숨은 select에 둔다.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useApp } from '../../app/context'
import { Icon } from '../../components/Icon'
import { LineBadges } from '../../components/LineBadge'
import type { Station } from '../../legacy/globals'
import { searchStations } from '../../lib/search'
import { allStations, getStation, koCompare, STATUS_CLASS, stationStatus, statusIcon, statusLabel, yeok } from '../../lib/stations'

const RECENT_KEY = 'ev.recentStations'

function recentStations(): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    return Array.isArray(ids) ? ids.filter((id: string) => !!getStation(id)) : []
  } catch { return [] }
}

function rememberStation(id: string) {
  const ids = recentStations().filter((x) => x !== id)
  ids.unshift(id)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 5))) } catch { /* 저장 못 하면 넘어간다 */ }
}

interface Props {
  role: 'origin' | 'dest'
  /** 선택된 역 ID(없으면 ''). */
  value: string
  onChange(id: string): void
  /** 숨은 select에 있는 역인지(원본 hasOption). */
  isOption(id: string): boolean
  label: string
  /** 역 이름이 바뀌면 입력칸 글자를 다시 맞추기 위한 값 */
  version: number
}

export function StationCombo({ role, value, onChange, isOption, label, version }: Props) {
  const { subscribeTabChange } = useApp()
  const [text, setText] = useState(() => (value && getStation(value) ? yeok(getStation(value)) : ''))
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Station[]>([])
  const [recent, setRecent] = useState<string[]>([])
  const [active, setActive] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const latest = useRef({ items, active, open, value })
  latest.current = { items, active, open, value }

  const close = () => { setOpen(false); setActive(-1) }

  // 외부에서 값이 바뀌면(바꾸기, openTime) 입력칸을 맞추고 닫는다(원본 set()).
  useLayoutEffect(() => {
    if (!value) return
    const st = getStation(value)
    setText(st ? yeok(st) : '')
    setOpen(false); setActive(-1)
  }, [value, version])

  useEffect(() => subscribeTabChange(() => { setOpen(false); setActive(-1) }), [subscribeTabChange])

  useEffect(() => {
    if (active < 0 || !listRef.current) return
    const el = listRef.current.querySelectorAll('[role="option"]')[active]
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' })
  }, [active])

  const render = (q: string) => {
    const rec = !q ? recentStations().slice(0, 5) : []
    const list = q ? searchStations(q) : allStations().sort((a, b) => {
      const ai = rec.indexOf(a.id), bi = rec.indexOf(b.id)
      if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
      return koCompare(a.name, b.name)
    })
    latest.current.items = list
    setRecent(rec); setItems(list); setActive(-1); setOpen(true)
    return list
  }

  const pick = (id: string) => {
    const st = getStation(id)
    const ok = !!st && isOption(id)
    setText(st ? yeok(st) : '')
    close()
    onChange(ok ? id : '')
    if (ok) rememberStation(id)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const { items: cur, active: act, open: isOpen, value: val } = latest.current
    if (e.key === 'Escape') { e.preventDefault(); close(); return }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      let list = cur
      if (!isOpen) list = render(val ? '' : text.trim())
      if (list.length) {
        const a = isOpen ? act : -1
        setActive(a < 0 ? (e.key === 'ArrowUp' ? list.length - 1 : 0) : (a + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length)
      }
    } else if (e.key === 'Enter' && isOpen) {
      e.preventDefault()
      const st = cur[act >= 0 ? act : 0]
      if (st) pick(st.id)
    }
  }

  const id = role
  return (
    <div className="station-combo" id={role + 'Combo'}>
      <input id={role + 'Search'} type="search" className="station-combo-input"
        placeholder="역 이름 검색" autoComplete="off" role="combobox"
        aria-expanded={open ? 'true' : 'false'} aria-controls={role + 'Results'} aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? id + '-option-' + active : undefined}
        value={text}
        onFocus={(e) => { e.target.select(); render('') }}
        onClick={() => { if (!open) render('') }}
        onChange={(e) => { setText(e.target.value); onChange(''); render(e.target.value.trim()) }}
        onBlur={close}
        onKeyDown={onKeyDown} />
      <div id={role + 'Results'} ref={listRef} className="station-combo-results" role="listbox" aria-label={label + ' 검색 결과'} hidden={!open}
        onPointerDown={(e) => e.preventDefault()}
        onClick={(e) => {
          const item = (e.target as Element).closest('[data-id]')
          if (item) pick(item.getAttribute('data-id') as string)
        }}>
        {open && (items.length ? items.map((st, i) => {
          const status = stationStatus(st.id)
          return (
            <div key={st.id} id={id + '-option-' + i} className={'combo-item' + (i === active ? ' active' : '')} data-id={st.id} role="option" aria-selected={i === active}>
              <span className="combo-name">{yeok(st)}{recent.indexOf(st.id) >= 0 ? <small className="muted"> · 최근</small> : null}</span>
              <span className="combo-badges"><LineBadges station={st} /><span className={'combo-status ' + (STATUS_CLASS[status] || 'unknown')} role="img" aria-label={'엘리베이터 ' + statusLabel(status)}><Icon name={statusIcon(status)} /></span></span>
            </div>
          )
        }) : <div className="combo-empty">역을 찾지 못했어요</div>)}
      </div>
    </div>
  )
}
