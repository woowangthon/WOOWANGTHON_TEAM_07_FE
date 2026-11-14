// 노선 필터 추가 시트 (app.js openFilterPicker). 선택은 시트 안에서만 바뀌고 "적용"에서 저장한다.
import { useState, type CSSProperties } from 'react'
import { useApp, type SheetContentProps } from '../app/context'
import { getLine } from '../lib/stations'
import { getCustomFilters, hasSession, mockLines, setCustomFilters } from '../views/elevator/filterStore'

export function FilterSheet({ sheet }: SheetContentProps) {
  void sheet
  const { closeSheet } = useApp()
  const [selected, setSelected] = useState<string[]>(() => getCustomFilters())
  const lineIds = Object.keys(mockLines())

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
  const apply = () => {
    if (!hasSession()) { closeSheet(); return }
    setCustomFilters(lineIds.filter((id) => selected.includes(id)))
    closeSheet()
  }

  return (
    <div id="filterPicker">
      <div className="sheet-header">
        <div className="sheet-title">노선 필터 추가</div>
        <div className="card-sub">노선을 선택하면 해당 노선 역만 표시됩니다</div>
      </div>
      <div className="sheet-section">
        <div className="filter-picker-grid">
          {lineIds.map((id) => {
            const l = getLine(id)
            return (
              <button type="button" key={id} className={'filter-picker-chip' + (selected.includes(id) ? ' selected' : '')}
                data-pick-line={id} style={{ '--line-color': l.color } as CSSProperties} onClick={() => toggle(id)}>
                <span className="filter-picker-dot"></span>{l.name}
              </button>
            )
          })}
        </div>
      </div>
      <div className="sheet-section">
        <button type="button" className="btn btn-primary btn-block" id="filterPickerDone" onClick={apply}>적용</button>
      </div>
    </div>
  )
}
