import { StrictMode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import App from './App'
import { missingServices } from './legacy/services'

const missing = missingServices()
const root = createRoot(document.getElementById('root')!)
if (missing.length) {
  // 서비스 스크립트(/legacy/js)를 못 불러오면 화면을 그리지 않고 원인을 보인다.
  root.render(<p role="alert">서비스 스크립트를 불러오지 못했습니다: {missing.join(', ')}</p>)
} else {
  // 첫 화면과 window.App을 DOMContentLoaded 전에 준비한다(기존 app.js와 같은 시점, 브라우저 테스트가 의존).
  flushSync(() => root.render(<StrictMode><App /></StrictMode>))
}
