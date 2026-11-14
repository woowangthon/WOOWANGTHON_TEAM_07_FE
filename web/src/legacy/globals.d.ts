/* eslint-disable @typescript-eslint/no-explicit-any -- 타입 없는 legacy JS 경계(MOCK, ApiClient 응답 등) */
// Prototype-v2 서비스 모듈(일반 <script>로 로드)이 만드는 전역의 타입 선언.
// 원본 JS가 실제 동작의 기준이다. 필드를 추가로 쓰게 되면 원본을 확인하고 여기에 보탠다.

export type StationStatus = 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE' | 'UNKNOWN'
export type ElevatorStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE' | 'UNKNOWN'
export type DataSource = 'api' | 'mock'

export interface Station {
  id: string
  name: string
  x: number
  y: number
  lines: string[]
}

export interface Line {
  id: string
  name: string
  short?: string
  color: string
  loop?: boolean
  segments: string[][]
  paths: string[]
}

export interface Elevator {
  id: string
  location?: string
  name?: string
  type?: 'exit' | 'platform' | 'transfer'
  floors?: string
  status: ElevatorStatus
  reason?: string
  unknownReason?: string | null
  fetchedAt?: string | null
}

export interface LiveState {
  live: boolean
  phase: string
  error: string | null
}

export interface ElevatorServiceApi {
  getStation(id: string): Station | null
  getAllStations(): Station[]
  findStationByName(text: string): Station | null
  findStationsInText(text: string): Station[]
  getLine(id: string): Line | null
  getElevators(stationId: string): Elevator[]
  sortForDisplay(list: Elevator[]): Elevator[]
  hasElevatorData(stationId: string): boolean
  getStationStatus(stationId: string): StationStatus
  getStatusLabel(status: StationStatus | ElevatorStatus): string
  getStatusIcon(status: StationStatus | ElevatorStatus): string
  toggleElevator(stationId: string, elevatorId: string): void
  setStationBroken(stationId: string, broken?: boolean): void
  reset(): void
  getNeighbors(stationId: string): string[]
  findAlternativeStation(stationId: string): Record<string, unknown> | null
  findAlternativeStationAsync(stationId: string): Promise<Record<string, unknown> | null>
  startLive(): Promise<void> | void
  refreshLive(): Promise<void> | void
  fetchStationElevators(stationId: string): Promise<void>
  isLive(): boolean
  getLiveState(): LiveState
  getElevatorsState(stationId: string): 'idle' | 'loading' | 'ready' | 'error' | 'unmapped'
  getStationInfo(stationId: string): Record<string, unknown> | null
  getLimitations(stationId: string): string[]
  getGlobalLimitations(): string[]
  getDataTime(stationId?: string): string | null
  getAccessibleRouteSnapshot(context?: unknown): unknown
  getOutages(): Array<Record<string, unknown>>
  subscribe(fn: (stationId: string | null) => void): () => void
}

export interface TimeCalculatorApi {
  findRoute(from: string, to: string): unknown
  calculateDeparture(opts: { originId: string; destId: string; arriveBy?: string | null; now?: Date; walkToStationMinutes?: number; stationEntryMinutes?: number; exitWalkMinutes?: number; bufferMinutes?: number }): Record<string, unknown> | null
  normalizeDepartureMinutes(opts?: Record<string, unknown>): { walk: number; entry: number; exit: number; buffer: number }
  calculateDepartureLive(opts: Record<string, unknown>): Promise<Record<string, unknown>>
  buildArrivalIso(...args: unknown[]): string
  parseKoreanTime(text: string): string | null
  formatTime(d: Date): string
  addMinutes(hhmm: string, minutes: number): string
  displayParts(hhmm: string): { ampm: string; time: string }
  displayTime(hhmm: string): string
  displayTimesInText(text: string): string
}

export interface MetroMapApi {
  init(container: HTMLElement, options: Record<string, unknown>): void
  refreshStatuses(): void
  focusStation(id: string, opts?: Record<string, unknown>): void
  selectStation(id: string | null): void
  highlightAlternative(from: string, to: string, path?: string[]): void
  clearHighlights(): void
  setLineFilter(lineId: string | null): void
  zoomIn(): void
  zoomOut(): void
  resetView(): void
  destroy(): void
}

export interface ChatAction { label: string; type: string; payload?: unknown }
export interface ChatResponse {
  text: string
  html?: string
  toolCalls?: Array<{ name: string; args?: Record<string, unknown> }>
  suggestions?: string[]
  actions?: ChatAction[]
}

export interface AIAgentApi {
  processMessage(text: string): Promise<ChatResponse>
  getWelcome(): ChatResponse
  reset(): void
}

export interface AuthSession { provider?: string; name?: string; [k: string]: unknown }
export interface AuthServiceApi {
  getSession(): AuthSession | null | false
  login(provider: string): Promise<unknown> | unknown
  logout(): Promise<unknown> | unknown
  subscribe(fn: (session: AuthSession | null | false) => void): void
}

export interface AppConfig {
  authMode: 'demo' | 'real' | string
  apiBase: string
  dataSource: DataSource | string
  beBase: string
  chatBase: string
}

declare global {
  interface Window {
    APP_CONFIG: AppConfig
    MOCK: Record<string, any>
    ApiClient: { isApiMode(): boolean; getJSON: (...a: any[]) => Promise<any>; postJSON: (...a: any[]) => Promise<any> }
    StationIdMap: { toBeId(slug: string): number | undefined; toSlug(id: number | string): string | undefined; load(opts?: unknown): Promise<unknown> }
    ElevatorService: ElevatorServiceApi
    TimeCalculator: TimeCalculatorApi
    MetroMap: MetroMapApi
    DepartureGraphic: { render(opts: Record<string, unknown>): string }
    AccessibleRoutes: Record<string, any>
    AccessibleRouteView: { render(payload: unknown, context?: unknown): string }
    AIAgent: AIAgentApi
    AuthService: AuthServiceApi
    App?: Record<string, unknown>
  }
}
