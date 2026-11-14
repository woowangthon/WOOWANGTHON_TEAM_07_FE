// 앱 틀: Prototype-v2/index.html의 body 마크업(desktop-stage > 시연 패널 + #phone)을 그대로 옮겼다.
// 화면별 내용은 src/views/*, 시트 내용은 src/sheets/*, 시연 패널은 DemoPanel.tsx가 맡는다.
import { useEffect, useRef, useState, type RefObject } from 'react'
import { useApp } from './context'
import { BottomSheet } from './BottomSheet'
import { DemoPanel } from './DemoPanel'
import { HeaderSearch } from './HeaderSearch'
import { StatusBar } from './StatusBar'
import { TabBar } from './TabBar'
import { Icon } from '../components/Icon'
import { apiMode } from '../lib/stations'
import { MapView } from '../views/map/MapView'
import { ElevatorView } from '../views/elevator/ElevatorView'
import { TimeView } from '../views/time/TimeView'
import { ChatView } from '../views/chat/ChatView'
import { AccountView } from '../views/account/AccountView'

// 아이콘 글꼴이 오면 아이콘을 보인다. 오기 전이나 못 받으면 이름 글자("search")를 숨겨 둔다 (REQ-DS-007)
function useIconFontReady() {
  useEffect(() => {
    const root = document.documentElement
    if (!document.fonts || !document.fonts.load) { root.classList.add('ms-ready'); return }
    document.fonts.load('24px "Material Symbols Rounded"', 'search').then((list) => {
      if (list && list.length) root.classList.add('ms-ready')
    }, () => {})
  }, [])
}

// 폰 화면 자체는 스크롤되지 않는다. 화면 밖(요약 상태 시트의 아래쪽 버튼 등)에 포커스가 가도
// 브라우저가 폰 화면을 밀어 올리지 않게 바로 되돌린다 (REQ-COM-004 뒤처리)
function useLockPhoneScroll(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const phone = ref.current
    if (!phone) return
    const onScroll = () => { if (phone.scrollTop || phone.scrollLeft) { phone.scrollTop = 0; phone.scrollLeft = 0 } }
    phone.addEventListener('scroll', onScroll)
    return () => phone.removeEventListener('scroll', onScroll)
  }, [ref])
}

export function AppShell() {
  const { currentTab, sheet, openSheet, closeSheet, toastMessage, toastVisible } = useApp()
  const phoneRef = useRef<HTMLDivElement>(null)
  // 목업 모드 표시(가상 데이터를 실제로 오해하지 않게). 실데이터 모드에서는 숨긴다. 시작 때 한 번 정한다.
  const [mockBadge] = useState(() => !apiMode())
  useIconFontReady()
  useLockPhoneScroll(phoneRef)

  return (
    <div className="desktop-stage">
      <DemoPanel />

      {/* 모바일 폰 프레임 */}
      <div id="phone" ref={phoneRef} className="phone">
        <StatusBar />

        <header className="app-header" hidden={currentTab === 'time' || currentTab === 'chat' || currentTab === 'login'}>
          <div id="dataSourceBadge" className="data-badge" role="status" hidden={!mockBadge}><Icon name="science" />목업 데이터 · 실제 상태가 아니에요</div>
          <HeaderSearch>
            <button
              id="demoBtn"
              className="icon-btn"
              type="button"
              aria-label="시연 제어판"
              onClick={() => { if (sheet.open && sheet.mode === 'demo') closeSheet(); else openSheet('demo', {}, 'auto') }}
            ><Icon name="settings" size="lg" /></button>
          </HeaderSearch>
        </header>

        <main className="views">
          <MapView />
          <ElevatorView />
          <TimeView />
          <ChatView />
          <AccountView />
        </main>

        <BottomSheet />
        <TabBar />

        <div id="toast" className={'toast' + (toastVisible ? ' show' : '')}>{toastMessage}</div>
      </div>
    </div>
  )
}
