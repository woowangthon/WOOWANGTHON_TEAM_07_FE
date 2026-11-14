// 바텀 시트 틀(#sheetBackdrop, #bottomSheet, #sheetHandle, #sheetContent). app.js의 시트 높이 계산·끌기·휠·Escape를 옮겼다.
// 내용은 시트 종류별 컴포넌트(src/sheets/registry.ts)가 #sheetContent 안에 그린다.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useApp } from './context'
import { sheetMetrics, sheetY, type SheetMetrics } from './sheetLayout'
import { sheetRegistry } from '../sheets/registry'

interface Drag { startY: number; dy: number; id: number; moved: boolean; base: number }

export function BottomSheet() {
  const { sheet, closeSheet, setSheetState, getSheet } = useApp()
  const bsRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const suppressClick = useRef(false)
  const dragCleanup = useRef<(() => void) | null>(null)

  // 닫혀도(미끄러져 내려가는 동안) 마지막 내용을 그대로 둔다. 원본이 닫을 때 내용을 지우지 않는 것과 같다.
  const [shown, setShown] = useState(sheet)
  if (sheet.open && shown !== sheet) setShown(sheet)
  const content = sheet.open ? sheet : shown
  const Content = content.mode ? sheetRegistry[content.mode] : undefined

  // 원본 applySheet 중 DOM 스타일 부분. 클래스(open/is-peek/is-full)와 막·손잡이 속성은 렌더가 정한다.
  const applyLayout = useCallback(() => {
    const bs = bsRef.current
    const s = getSheet()
    if (!bs) return
    const m = sheetMetrics()
    if (s.state === 'auto') {
      bs.style.height = s.mode === 'pick' ? m.full + 'px' : '' // 역 고르기는 결과 수가 바뀌어도 높이 고정
      bs.style.maxHeight = m.full + 'px'
    } else {
      bs.style.height = m.full + 'px'
      bs.style.maxHeight = 'none'
    }
    bs.style.setProperty('--sheet-y', sheetY(s.state, m) + 'px')
    if (s.state === 'peek' && contentRef.current) contentRef.current.scrollTop = 0
  }, [getSheet])

  useLayoutEffect(() => { if (sheet.open) applyLayout() }, [sheet, applyLayout])

  // 내용이 바뀌어 요약 높이가 달라지면(상태 갱신, 우회 경로 버튼 등) 다시 잰다.
  useEffect(() => {
    const el = contentRef.current
    if (!el || typeof MutationObserver === 'undefined') return
    let raf = 0
    const mo = new MutationObserver(() => {
      if (!getSheet().open || raf) return
      raf = requestAnimationFrame(() => { raf = 0; if (getSheet().open) applyLayout() })
    })
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    return () => { mo.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [applyLayout, getSheet])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && getSheet().open) closeSheet() }
    const onResize = () => { if (getSheet().open) applyLayout() }
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
      if (dragCleanup.current) dragCleanup.current()
    }
  }, [applyLayout, closeSheet, getSheet])

  // 요약에서 내용을 위로 밀면(휠) 펼침. preventDefault가 필요해 passive가 아닌 네이티브 리스너로 건다.
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (getSheet().state === 'peek' && e.deltaY > 0) { e.preventDefault(); setSheetState('full') }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [getSheet, setSheetState])

  // 끌기: 위로 끌면 펼침, 아래로 끌면 요약, 요약에서 더 끌면 닫힘. 닫기는 아래로 끌기로만.
  //   역 시트 요약일 때는 시트 어디를 끌어도 되고, 펼침일 때는 손잡이·머리 부분만(내용은 스크롤).
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const bs = bsRef.current
    const target = e.target as Element
    const cur = getSheet()
    if (!bs || !cur.open || (e.pointerType === 'mouse' && e.button !== 0)) return
    const onHandle = !!target.closest('.sheet-handle')
    if (!onHandle && target.closest('button, a, input, select, label')) return
    const head = onHandle || target.closest('.sheet-header')
    if (!head && cur.state !== 'peek') return
    const m: SheetMetrics = sheetMetrics()
    const drag: Drag = { startY: e.clientY, dy: 0, id: e.pointerId, moved: false, base: sheetY(cur.state, m) }

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== drag.id) return
      drag.dy = ev.clientY - drag.startY
      if (!drag.moved && Math.abs(drag.dy) < 6) return
      drag.moved = true
      bs.style.transition = 'none'
      const y = getSheet().state === 'auto' ? Math.max(0, drag.dy) : Math.max(0, drag.base + drag.dy)
      bs.style.setProperty('--sheet-y', y + 'px')
      ev.preventDefault()
      ev.stopPropagation() // 끄는 동안 지도가 같이 움직이지 않게
    }
    const end = (ev?: PointerEvent) => {
      if (ev && ev.pointerId !== drag.id) return
      stop()
      bs.style.transition = ''
      if (!drag.moved) return // 그냥 누른 것: 손잡이는 click에서 처리
      suppressClick.current = true
      setTimeout(() => { suppressClick.current = false }, 0)
      const dy = drag.dy
      const state = getSheet().state
      if (state === 'auto') { if (dy > 80) closeSheet(); else applyLayout(); return }
      if (state === 'full') { if (dy > 60) setSheetState('peek'); else { setSheetState('full'); applyLayout() } return }
      // 요약
      if (dy < -40) setSheetState('full')
      else if (dy > 60) closeSheet()
      else applyLayout()
    }
    // 끄는 동안 손가락이 시트 밖으로 나가도 따라가도록 화면 전체에서 받는다
    const stop = () => {
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerup', end, true)
      window.removeEventListener('pointercancel', end, true)
      dragCleanup.current = null
    }
    if (dragCleanup.current) dragCleanup.current()
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerup', end, true)
    window.addEventListener('pointercancel', end, true)
    dragCleanup.current = stop
  }

  const onHandleClick = () => {
    if (suppressClick.current) { suppressClick.current = false; return }
    const s = getSheet().state
    if (s === 'peek') setSheetState('full')
    else if (s === 'full') setSheetState('peek')
  }

  const state = sheet.state
  const cls = 'bottom-sheet' + (sheet.open ? ' open' : '') + (state === 'peek' ? ' is-peek' : '') + (state === 'full' ? ' is-full' : '')
  return (
    <>
      <div
        id="sheetBackdrop"
        className={'sheet-backdrop' + (sheet.open && state === 'auto' ? ' show' : '')}
        onClick={() => { if (getSheet().state === 'auto') closeSheet(); else setSheetState('peek') }}
      />
      <div id="bottomSheet" ref={bsRef} className={cls} role="dialog" aria-modal="true" onPointerDown={onPointerDown}>
        <button
          id="sheetHandle"
          className="sheet-handle"
          type="button"
          aria-label={state === 'peek' || state === null ? '시트 펼치기' : '시트 접기'}
          aria-controls="sheetContent"
          aria-expanded={sheet.open ? state === 'full' : undefined}
          hidden={state === 'auto'}
          onClick={onHandleClick}
        />
        <div id="sheetContent" ref={contentRef} className="sheet-content">
          {Content ? <Content sheet={content} /> : null}
        </div>
      </div>
    </>
  )
}
