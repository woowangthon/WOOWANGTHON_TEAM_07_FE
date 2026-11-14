// Vitest(jsdom)에서 브라우저와 같은 순서로 Prototype-v2 서비스 스크립트를 전역 실행한다(mock 모드).
import fs from 'node:fs'
import path from 'node:path'

const LEGACY_JS = path.resolve(__dirname, '../../../Prototype-v2/js')
const ORDER = ['mock-data', 'api-client', 'station-id-map', 'elevator-service', 'time-calculator', 'metro-map',
  'departure-graphic', 'accessible-routes', 'accessible-route-view', 'ai-agent', 'auth']

window.APP_CONFIG = { authMode: 'demo', apiBase: '', dataSource: 'mock', beBase: 'http://127.0.0.1:8000', chatBase: 'http://127.0.0.1:8001' }
for (const name of ORDER) {
  const code = fs.readFileSync(path.join(LEGACY_JS, name + '.js'), 'utf8')
  // 일반 <script>처럼 전역 스코프에서 non-strict로 실행한다.
  ;(0, window.eval)(code)
}
