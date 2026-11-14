// 앱 전역 상태·API의 계약. 구현은 AppContext.tsx(AppProvider). 컴포넌트는 useApp()으로만 쓴다.
import { createContext, useContext } from 'react'

export const TABS = ['map', 'elevator', 'time', 'chat', 'login'] as const
export type TabName = (typeof TABS)[number]

/** 바텀 시트 종류. 새 시트를 만들면 여기에 이름을 더하고 src/sheets/registry.ts에 컴포넌트를 등록한다. */
export type SheetMode = 'station' | 'demo' | 'filter' | 'favDetail' | 'pick'
/** station 시트는 'peek'(요약)/'full'(펼침), 나머지는 'auto'(내용 높이 + 막). (REQ-COM-004) */
export type SheetState = 'peek' | 'full' | 'auto'

export interface SheetModel {
  open: boolean
  mode: SheetMode | null
  stationId: string | null
  alt: unknown
  state: SheetState | null
  /** openSheet에 넘긴 임의의 값. 시트 컴포넌트가 읽는다. */
  payload: Record<string, unknown>
}

export interface SheetPayload {
  stationId?: string | null
  alt?: unknown
  [key: string]: unknown
}

export interface OpenStationOptions {
  /** 시트 시작 단계. 기본 'peek'. */
  state?: SheetState
}

export interface OpenTimeOptions {
  originId?: string
  destId?: string
  /** 'HH:MM'이면 도착 시각 맞추기, 키는 있는데 값이 비면(null/'') "지금 출발". 키가 없으면 바꾸지 않는다. */
  arriveBy?: string | null
}

/**
 * openTime()이 남기는 "출발계산 탭이 처리할 요청". 출발계산 탭 컴포넌트가 pendingTime을 보고
 * 폼에 값을 채운 뒤 제출(원본 openTime: 역 선택 → 모드/시각 반영 → submitTime → 스크롤 맨 위)하고 clearPendingTime(id)을 부른다.
 * id는 요청마다 증가하므로 같은 값으로 연달아 불러도 useEffect가 다시 돈다.
 */
export interface TimeRequest {
  id: number
  originId?: string
  destId?: string
  /** opts에 arriveBy 키가 있었는지(원본의 hasOwnProperty 검사). */
  hasArriveBy: boolean
  arriveBy?: string | null
}

/**
 * askChat()이 남기는 "챗 탭이 보낼 질문". 챗 탭 컴포넌트가 pendingChat을 보고 sendChat(text)(원본 sendChat: 사용자 말풍선 추가 + AI 호출)를
 * 부른 뒤 clearPendingChat(id)를 부른다. id는 요청마다 증가한다. (역 시트 "AI에게 물어보기"가 사용)
 */
export interface ChatRequest { id: number; text: string }

/** 렌더와 무관하게 항상 같은 참조인 함수들. useEffect 의존성에 넣어도 다시 실행되지 않는다. */
export interface AppApi {
  switchTab(name: string): void
  /** 탭 전환(같은 탭이어도)마다 불린다. 검색 결과 닫기, 챗 맨 아래로 스크롤 같은 후처리용. 해제 함수를 돌려준다. */
  subscribeTabChange(fn: (tab: TabName) => void): () => void
  toast(msg: unknown): void
  openSheet(mode: SheetMode, payload?: SheetPayload, state?: SheetState): void
  closeSheet(): void
  setSheetState(state: SheetState): void
  /** 열린 시트의 stationId/alt/payload만 바꾼다(높이는 다시 잰다). */
  patchSheet(patch: Partial<Pick<SheetModel, 'stationId' | 'alt' | 'payload'>>): void
  /** 이벤트 핸들러 안에서 최신 시트 값을 읽는다(렌더 값은 한 박자 늦을 수 있다). */
  getSheet(): SheetModel
  openStation(id: string, opts?: OpenStationOptions): void
  openTime(opts?: OpenTimeOptions): void
  clearPendingTime(id: number): void
  /** 시트를 닫고 챗 탭으로 가서 text를 보내게 한다(원본: closeSheet(); switchTab('chat'); sendChat(text)). */
  askChat(text: string): void
  clearPendingChat(id: number): void
  selectDemoStation(id: string | null): void
  setLoginTabLabel(label: string): void
}

export interface AppState {
  currentTab: TabName
  sheet: SheetModel
  toastMessage: string
  toastVisible: boolean
  /** 시연 제어판에서 조작할 역(마지막으로 연 역). */
  demoStationId: string | null
  pendingTime: TimeRequest | null
  pendingChat: ChatRequest | null
  /** 탭바 마지막 탭 이름. 로그인 상태에 따라 '로그인'/'마이페이지'. */
  loginTabLabel: string
}

export type AppContextValue = AppState & AppApi

export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp은 <AppProvider> 안에서만 쓸 수 있다')
  return ctx
}

/** 시트 내용 컴포넌트가 받는 props. 시트 종류별 컴포넌트는 src/sheets/registry.ts에 등록한다. */
export interface SheetContentProps { sheet: SheetModel }
