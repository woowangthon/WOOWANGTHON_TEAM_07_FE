import { isApiMode } from './legacy/services'
import { useElevatorVersion } from './hooks/useElevatorService'

// 0단계 뼈대: 서비스가 로드되고 React에서 읽히는지만 보인다. 화면은 1단계부터 옮긴다.
export default function App() {
  useElevatorVersion()
  const stations = window.ElevatorService.getAllStations().length
  return (
    <div className="desktop-stage" data-react-scaffold>
      <p>React 뼈대: 데이터 모드 {isApiMode() ? 'api' : 'mock'}, 역 {stations}개</p>
    </div>
  )
}
