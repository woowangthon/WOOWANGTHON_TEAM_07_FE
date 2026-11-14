import { useRef, useState } from 'react'
import { useApp, type TabName } from './context'
import { Icon } from '../components/Icon'

const TAB_ITEMS: Array<{ tab: TabName; icon: string; label: string }> = [
  { tab: 'map', icon: 'map', label: '노선도' },
  { tab: 'elevator', icon: 'elevator', label: '엘리베이터' },
  { tab: 'time', icon: 'schedule', label: '출발계산' },
  { tab: 'chat', icon: 'smart_toy', label: 'AI 챗봇' },
  { tab: 'login', icon: 'person', label: '로그인' },
]

/** 하단 탭바. 누른 탭에 회색 둥근 사각형을 한 번 깔았다 지운다(REQ-COM-008). */
export function TabBar() {
  const { currentTab, switchTab, loginTabLabel } = useApp()
  // 'pressing'은 DOM에도 직접 걸어 연달아 눌러도 애니메이션을 처음부터 다시 재생하고, 상태에도 둬 다시 그려져도 지워지지 않게 한다.
  const [pressing, setPressing] = useState<TabName | null>(null)
  const refs = useRef<Partial<Record<TabName, HTMLButtonElement | null>>>({})

  const flash = (tab: TabName) => {
    const el = refs.current[tab]
    if (el) {
      el.classList.remove('pressing')
      void el.offsetWidth // 연달아 눌러도 처음부터 다시 재생
      el.classList.add('pressing')
    }
    setPressing(tab)
  }

  return (
    <nav className="tab-bar">
      {TAB_ITEMS.map(({ tab, icon, label }) => (
        <button
          key={tab}
          ref={(el) => { refs.current[tab] = el }}
          className={'tab' + (currentTab === tab ? ' active' : '') + (pressing === tab ? ' pressing' : '')}
          data-tab={tab}
          type="button"
          onPointerDown={() => flash(tab)}
          onClick={(e) => {
            if (e.detail === 0) flash(tab) // 키보드로 누른 경우
            switchTab(tab)
          }}
          // 회색 사각형(탭 자신의 ::before)이 끝날 때 뗀다. 아이콘·이름의 커짐 효과는 그보다 먼저 끝난다
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget) return
            e.currentTarget.classList.remove('pressing')
            setPressing((cur) => (cur === tab ? null : cur))
          }}
        >
          <Icon name={icon} size="lg" className="tab-icon" />
          <span>{tab === 'login' ? loginTabLabel : label}</span>
        </button>
      ))}
    </nav>
  )
}
