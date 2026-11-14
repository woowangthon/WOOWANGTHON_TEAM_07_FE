import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { missingServices } from './legacy/services'

const missing = missingServices()
const root = createRoot(document.getElementById('root')!)
if (missing.length) {
  // 서비스 스크립트(/legacy/js)를 못 불러오면 화면을 그리지 않고 원인을 보인다.
  root.render(<p role="alert">서비스 스크립트를 불러오지 못했습니다: {missing.join(', ')}</p>)
} else {
  root.render(<StrictMode><App /></StrictMode>)
}
