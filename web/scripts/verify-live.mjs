// 로컬 BE/AI와 연결한다. DB는 SQLite backup으로 복사하고 LLM 키는 빈 값으로 덮는다.
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
import puppeteer from 'puppeteer-core'

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let workspace = process.env.MIGRATION_WORKSPACE || web
while (!fs.existsSync(path.join(workspace, 'BE')) || !fs.existsSync(path.join(workspace, 'AI'))) {
  const parent = path.dirname(workspace)
  if (parent === workspace) throw new Error('MIGRATION_WORKSPACE에 BE와 AI의 상위 폴더를 지정하세요.')
  workspace = parent
}
const out = path.join(web, 'artifacts/live')
fs.mkdirSync(out, { recursive: true })
const python = (name) => path.join(workspace, name, '.venv/Scripts/python.exe')
const children = []
const results = []
let browser
function launch(name, command, args, options = {}) {
  const log = fs.openSync(path.join(out, name + '.log'), 'w')
  const child = spawn(command, args, { cwd: web, stdio: ['ignore', log, log], ...options })
  fs.closeSync(log)
  children.push(child)
  return child
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  const closed = once(child, 'exit')
  child.kill()
  await closed
}
async function ready(url) {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return } catch { /* 서버 준비 중 */ }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('서버 준비 실패: ' + url)
}
function check(value, name) { assert(value, name); results.push(name); console.log('PASS ' + name) }
try {
  const db = path.join(out, 'verification.db')
  const copy = launch('db-backup', python('BE'), ['-c', 'import sqlite3,sys; src=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True); dst=sqlite3.connect(sys.argv[2]); src.backup(dst); dst.close(); src.close()', path.join(workspace, 'BE/data/dev.db'), db])
  const [exit] = await once(copy, 'exit')
  assert.equal(exit, 0, 'DB backup')
  const be = launch('be', python('BE'), ['-m', 'uvicorn', 'app.main:app', '--port', '18000', '--host', '127.0.0.1'], {
    cwd: path.join(workspace, 'BE'),
    env: { ...process.env, DATABASE_URL: 'sqlite:///' + db.replaceAll('\\', '/'), CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:5175', SEOUL_OPEN_API_KEY: '', PYTHONDONTWRITEBYTECODE: '1' },
  })
  const ai = launch('ai', python('BE'), ['-m', 'uvicorn', 'AI.src.api.app:app', '--port', '18001', '--host', '127.0.0.1'], {
    cwd: workspace,
    env: { ...process.env, AI_DATA_SOURCE: 'be', BE_API_BASE_URL: 'http://127.0.0.1:18000', CORS_ALLOW_ORIGINS: 'http://127.0.0.1:5175', FACTCHAT_API_KEY: '', NVIDIA_API_KEY: '', PYTHONDONTWRITEBYTECODE: '1' },
  })
  launch('vite', process.execPath, [path.join(web, 'node_modules/vite/bin/vite.js'), '--port', '5175', '--strictPort'], {
    env: { ...process.env, VITE_DATA_SOURCE: 'api', VITE_BE_BASE: 'http://127.0.0.1:18000', VITE_CHAT_BASE: 'http://127.0.0.1:18001', VITE_AUTH_MODE: 'demo' },
  })
  await Promise.all([ready('http://127.0.0.1:18000/health'), ready('http://127.0.0.1:18001/health'), ready('http://127.0.0.1:5175/')])
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const errors = []
  const apiResponses = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('response', async (r) => {
    if (r.url().includes('/api/')) {
      let data
      try { data = await r.json() } catch { /* CORS preflight */ }
      apiResponses.push({ url: r.url(), status: r.status(), data })
    }
  })
  await page.setViewport({ width: 390, height: 844 })
  await page.setRequestInterception(true)
  page.on('request', (r) => /^https?:/.test(r.url()) && !/^http:\/\/127\.0\.0\.1:(5175|18000|18001)\//.test(r.url()) ? r.abort() : r.continue())
  await page.goto('http://127.0.0.1:5175/', { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => ElevatorService.getLiveState().phase === 'ready')
  check(await page.$eval('#dataSourceBadge', (e) => e.hidden), 'API 모드에서 mock 배지 숨김')
  await page.evaluate(() => App.openStation('gangnam'))
  await page.waitForFunction(() => ElevatorService.getElevatorsState('gangnam') === 'ready')
  check(await page.$$eval('#sheetContent .elev-item', (e) => e.length > 0), '강남역 설비를 실제 BE 응답으로 표시')
  check(await page.$$eval('[data-demo-act="demo-station-broken"]', (e) => e.length === 0), 'API 모드에서 가상 고장 조작 숨김')
  await page.click('#sheetHandle')
  await page.screenshot({ path: path.join(out, 'gangnam.png') })
  await page.evaluate(() => App.openTime({ originId: 'gangnam', destId: 'gyodae', arriveBy: '15:00' }))
  await page.waitForSelector('#timeResult .big-time')
  check(await page.$eval('#timeResult', (e) => e.textContent.includes('시간표 열차 기준')), '강남→교대 시간표 열차 계산')
  await page.screenshot({ path: path.join(out, 'timetable.png') })
  await page.evaluate(() => App.openTime({ originId: 'gangnam', destId: 'seoul', arriveBy: '15:00' }))
  await page.waitForFunction(() => !document.querySelector('#timeResult').hasAttribute('aria-busy'))
  check(await page.$eval('#timeResult', (e) => /환승 [1-9]/.test(e.textContent) && e.textContent.includes('추정')), '환승 경로와 추정 표시')
  await page.evaluate(() => App.switchTab('chat'))
  await page.type('#chatInput', '강남역 엘리베이터 어때?')
  await page.click('#chatForm button[type="submit"]')
  await page.waitForFunction(() => !document.querySelector('#chatInput').disabled)
  check(await page.$$eval('#chatMessages .msg.bot', (e) => e.length === 2), '실제 AI 서버 챗봇 응답')
  check(await page.$eval('#chatMessages', (e) => !e.textContent.includes('지금은 답변할 수 없습니다')), 'AI 응답을 연결 실패와 구분')
  await page.waitForSelector('#chatMessages .msg-actions button')
  await page.click('#chatMessages .msg-actions button')
  await page.waitForSelector('#bottomSheet.open')
  check(await page.$eval('#sheetContent .sheet-title', (e) => e.textContent.includes('강남')), '챗봇 버튼으로 강남역 시트 열기')
  await stop(ai)
  await page.evaluate(() => App.switchTab('chat'))
  await page.type('#chatInput', '교대역 엘리베이터 어때?')
  await page.click('#chatForm button[type="submit"]')
  await page.waitForFunction(() => !document.querySelector('#chatInput').disabled)
  check(await page.$eval('#chatMessages .msg.bot:last-child', (e) => e.textContent.includes('지금은 답변할 수 없습니다')), 'AI 중단 시 오류 표시, 로컬 mock 응답 없음')
  await stop(be)
  await page.evaluate(() => ElevatorService.refreshLive())
  check(await page.evaluate(() => ElevatorService.getLiveState().phase === 'error' && ElevatorService.getStationStatus('gangnam') === 'UNKNOWN'), 'BE 중단 시 기존 정상 상태를 버리고 UNKNOWN 표시')
  await page.evaluate(() => App.openTime({ originId: 'gangnam', destId: 'gyodae', arriveBy: '15:00' }))
  await page.waitForSelector('#timeResult [role="alert"]')
  check(await page.$eval('#timeResult', (e) => !e.querySelector('.big-time') && e.textContent.includes('연결')), 'BE 중단 시 출발 계산 실패 표시')
  check(errors.length === 0, '브라우저 런타임 오류 없음')
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ checks: results, apiResponses, errors, llm: 'disabled: actual AI server, BE-backed fallback engine' }, null, 2))
} finally {
  if (browser) await browser.close()
  await Promise.all(children.map(stop))
}
