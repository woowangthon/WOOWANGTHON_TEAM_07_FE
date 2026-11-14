// 앱 전역 상태(탭, 토스트, 바텀 시트, 시연 역, 출발계산 요청)와 그것을 바꾸는 API. app.js의 전역 변수·함수에 해당한다.
// 함수들(AppApi)은 한 번만 만들어 계속 같은 참조를 쓴다. 최신 값은 ref에 동기로 반영하므로
// window.App.openStation('x')처럼 React 밖에서 연달아 불러도 앞 호출의 결과를 본다.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  AppContext, TABS,
  type AppApi, type AppContextValue, type SheetModel, type TabName, type TimeRequest,
} from './context'
import { installCompat } from './compat'
import { apiMode, getStation, mapCall } from '../lib/stations'

const TOAST_MS = 2200

const CLOSED_SHEET: SheetModel = { open: false, mode: null, stationId: null, alt: null, state: null, payload: {} }

// 실데이터 모드의 startLive는 앱 시작 때 한 번만 부른다(StrictMode가 effect를 두 번 돌려도).
let liveStarted = false

function isTab(name: string): name is TabName { return (TABS as readonly string[]).includes(name) }

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentTab, setCurrentTab] = useState<TabName>('map')
  const [sheet, setSheet] = useState<SheetModel>(CLOSED_SHEET)
  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const [demoStationId, setDemoStationId] = useState<string | null>(null)
  const [pendingTime, setPendingTime] = useState<TimeRequest | null>(null)
  const [loginTabLabel, setLoginTabLabel] = useState('로그인')

  const sheetRef = useRef<SheetModel>(CLOSED_SHEET)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeSeq = useRef(0)
  // 지도 초점은 탭/시트가 화면에 반영된 뒤(지도가 보이는 상태)에 맞춰야 한다. 원본은 DOM을 바로 바꿨기 때문에 같은 효과.
  const pendingFocus = useRef<string | null>(null)

  const api = useMemo<AppApi>(() => {
    const tabListeners = new Set<(tab: TabName) => void>()
    const commitSheet = (next: SheetModel) => { sheetRef.current = next; setSheet(next) }

    const closeSheet: AppApi['closeSheet'] = () => {
      commitSheet(CLOSED_SHEET)
      mapCall('selectStation', null)
      mapCall('clearHighlights')
    }

    const switchTab: AppApi['switchTab'] = (name) => {
      if (!isTab(name)) return
      setCurrentTab(name)
      if (name !== 'map' && sheetRef.current.open) closeSheet()
      tabListeners.forEach((fn) => fn(name))
    }

    const toast: AppApi['toast'] = (msg) => {
      setToastMessage(msg == null ? '' : String(msg))
      setToastVisible(true)
      if (toastTimer.current) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setToastVisible(false), TOAST_MS)
    }

    const openSheet: AppApi['openSheet'] = (mode, payload = {}, state = 'auto') => {
      commitSheet({ open: true, mode, stationId: payload.stationId ?? null, alt: payload.alt ?? null, state, payload })
    }

    return {
      switchTab,
      subscribeTabChange(fn) { tabListeners.add(fn); return () => { tabListeners.delete(fn) } },
      toast,
      openSheet,
      closeSheet,
      setSheetState(state) {
        if (!sheetRef.current.open) return
        commitSheet({ ...sheetRef.current, state })
      },
      patchSheet(patch) {
        if (!sheetRef.current.open) return
        commitSheet({ ...sheetRef.current, ...patch })
      },
      getSheet: () => sheetRef.current,
      selectDemoStation: (id) => setDemoStationId(id),
      setLoginTabLabel,
      openStation(id, opts) {
        if (!getStation(id)) { toast('역 정보를 찾을 수 없어요'); return }
        switchTab('map')
        pendingFocus.current = id
        setDemoStationId(id)
        openSheet('station', { stationId: id }, opts?.state ?? 'peek') // 다른 역을 눌러도 그 역의 요약으로
        if (apiMode()) { const es = window.ElevatorService; if (es && es.fetchStationElevators) es.fetchStationElevators(id) }
      },
      openTime(opts) {
        const o = opts || {}
        closeSheet()
        switchTab('time')
        timeSeq.current += 1
        setPendingTime({
          id: timeSeq.current, originId: o.originId, destId: o.destId,
          hasArriveBy: Object.prototype.hasOwnProperty.call(o, 'arriveBy'), arriveBy: o.arriveBy,
        })
      },
      clearPendingTime(id) { setPendingTime((cur) => (cur && cur.id === id ? null : cur)) },
    }
  }, [])

  // 원본 switchTab의 document.body.setAttribute('data-active-tab', name). CSS(body[data-active-tab=...])가 쓴다.
  useLayoutEffect(() => { document.body.setAttribute('data-active-tab', currentTab) }, [currentTab])

  useLayoutEffect(() => {
    const id = pendingFocus.current
    if (!id) return
    pendingFocus.current = null
    mapCall('focusStation', id, {})
  }, [sheet, currentTab])

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])
  // 기존 app.js는 스크립트 끝에서 window.App을 바로 만들었다. 테스트가 DOMContentLoaded 직후 부르므로 layout effect에서 설치한다(main.tsx는 flushSync로 첫 렌더를 동기 커밋).
  useLayoutEffect(() => installCompat(api), [api])

  // 데이터 원천: 실데이터 모드면 BE 상태 불러오기를 시작한다(목업 배지는 AppShell이 apiMode로 숨긴다).
  useEffect(() => {
    if (!apiMode() || liveStarted) return
    liveStarted = true
    const es = window.ElevatorService
    if (es && es.startLive) es.startLive()
  }, [])

  const value = useMemo<AppContextValue>(() => ({
    ...api, currentTab, sheet, toastMessage, toastVisible, demoStationId, pendingTime, loginTabLabel,
  }), [api, currentTab, sheet, toastMessage, toastVisible, demoStationId, pendingTime, loginTabLabel])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
