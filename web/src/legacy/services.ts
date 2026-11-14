// 서비스 전역 접근 지점. 컴포넌트는 window.* 대신 여기서 가져다 쓴다(나중에 TS 모듈로 바꿀 때 이 파일만 바꾸면 된다).
export const ES = () => window.ElevatorService
export const TC = () => window.TimeCalculator
export const Map = () => window.MetroMap
export const Agent = () => window.AIAgent
export const Auth = () => window.AuthService
export const Api = () => window.ApiClient
export const IdMap = () => window.StationIdMap
export const isApiMode = () => !!window.ApiClient && window.ApiClient.isApiMode()

/** 서비스 스크립트가 모두 로드됐는지. main.tsx가 렌더 전에 확인한다. */
export function missingServices(): string[] {
  const names = ['MOCK', 'ApiClient', 'StationIdMap', 'ElevatorService', 'TimeCalculator', 'MetroMap',
    'DepartureGraphic', 'AccessibleRoutes', 'AccessibleRouteView', 'AIAgent', 'AuthService'] as const
  return names.filter((n) => !(window as unknown as Record<string, unknown>)[n])
}
