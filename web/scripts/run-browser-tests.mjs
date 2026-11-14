// mock 모드로 빌드한 React 앱을 vite preview로 띄우고, 기존 브라우저 테스트(FE/tests/browser-*.cjs)를 그 주소로 돌린다.
// 사용: npm run build:mock && npm run test:browser [-- 파일이름 일부]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const webDir = path.resolve(here, '..')
const testsDir = path.resolve(webDir, '../tests')
const URL = 'http://127.0.0.1:4173/'
const filter = process.argv[2] || ''

if (!fs.existsSync(path.join(webDir, 'dist/index.html'))) {
  console.error('dist가 없습니다. 먼저 npm run build:mock 을 실행하세요.')
  process.exit(2)
}

const preview = spawn(process.execPath, [path.join(webDir, 'node_modules/vite/bin/vite.js'), 'preview', '--strictPort'], { cwd: webDir, stdio: 'ignore' })
const stop = () => { try { preview.kill() } catch { /* already stopped */ } }
process.on('exit', stop)

async function waitForServer(ms = 15000) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try { if ((await fetch(URL)).ok) return } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('vite preview가 뜨지 않았습니다: ' + URL)
}

function run(file) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(testsDir, file)], {
      cwd: path.resolve(webDir, '..'),
      env: { ...process.env, APP_FILE: URL, PUPPETEER_MODULE: path.join(here, 'puppeteer-chrome.cjs') },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.stderr.on('data', (d) => { out += d })
    child.on('close', (code) => resolve({ file, code, out }))
  })
}

await waitForServer()
const files = fs.readdirSync(testsDir).filter((f) => /^browser-.*\.cjs$/.test(f) && f.includes(filter)).sort()
let failed = 0
for (const f of files) {
  const r = await run(f)
  const tail = r.out.trim().split('\n').filter((l) => !/^\s+at /.test(l)).slice(-3).join(' | ')
  console.log((r.code === 0 ? 'PASS ' : 'FAIL ') + f + ' :: ' + tail)
  if (r.code !== 0) { failed += 1; console.error(r.out) }
}
stop()
process.exit(failed ? 1 : 0)
