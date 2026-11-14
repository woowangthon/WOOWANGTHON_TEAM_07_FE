// 실제 외부 LLM + BE 복사본 + React 검증. 명시적인 플래그가 있어야 외부 요청을 보낸다.
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { containsTime } from './llm-quality.mjs'

if (!process.argv.includes('--allow-external-llm')) {
  console.error('실제 외부 호출이 발생합니다. --allow-external-llm을 명시하세요.')
  process.exit(2)
}
const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspace = process.env.MIGRATION_WORKSPACE || path.resolve(web, '../..')
const diagnostic = process.argv.includes('--answer-mode-llm')
const out = path.join(web, 'artifacts', diagnostic ? 'external-llm-prose' : 'external-llm')
fs.mkdirSync(out, { recursive: true })
const llmPython = process.env.LLM_PYTHON || path.join(web, 'artifacts/llm-venv/Scripts/python.exe')
const bePython = path.join(workspace, 'BE/.venv/Scripts/python.exe')
const children = []
const results = []
const uiChecks = []
let browser
let failure
function launch(name, command, args, options = {}) {
  const log = fs.openSync(path.join(out, name + '.log'), 'w')
  const child = spawn(command, args, { cwd: web, stdio: ['ignore', log, log], ...options })
  fs.closeSync(log)
  children.push(child)
  child.on('error', (error) => { failure = error.message })
  return child
}
async function stop(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return
  const closed = once(child, 'exit')
  child.kill()
  await closed
}
async function ready(url) {
  for (let i = 0; i < 100; i++) {
    if (failure) throw new Error(failure)
    if (children.some((c) => c.exitCode !== null && c.exitCode !== 0)) throw new Error('검증 서버 실행 실패. 로컬 로그를 확인하세요.')
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return } catch { /* 준비 중 */ }
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error('서버 준비 실패: ' + url)
}
async function json(url, body) {
  const response = await fetch(url, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + new URL(url).pathname)
  return response.json()
}
function ui(value, name) {
  uiChecks.push({ name, passed: !!value })
  console.log((value ? 'PASS ' : 'FAIL ') + name)
}
try {
  fs.writeFileSync(path.join(out, 'gateway-calls.jsonl'), '')
  const db = path.join(out, 'verification.db')
  const copy = launch('backup', bePython, ['-c', 'import sqlite3,sys; src=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True); dst=sqlite3.connect(sys.argv[2]); src.backup(dst); dst.close(); src.close()', path.join(workspace, 'BE/data/dev.db'), db])
  const [code] = await once(copy, 'exit')
  if (code !== 0) throw new Error('DB 복사 실패')
  launch('be', bePython, ['-m', 'uvicorn', 'app.main:app', '--port', '18002'], {
    cwd: path.join(workspace, 'BE'),
    env: { ...process.env, DATABASE_URL: 'sqlite:///' + db.replaceAll('\\', '/'), CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:5176', SEOUL_OPEN_API_KEY: '', PYTHONDONTWRITEBYTECODE: '1' },
  })
  launch('ai', llmPython, [path.join(web, 'scripts/llm-validation-server.py'), '--workspace', workspace, '--output', out, ...(diagnostic ? ['--answer-mode', 'llm'] : [])], {
    cwd: workspace,
    env: { ...process.env, AI_DATA_SOURCE: 'be', BE_API_BASE_URL: 'http://127.0.0.1:18002', CORS_ALLOW_ORIGINS: 'http://127.0.0.1:5176', PYTHONDONTWRITEBYTECODE: '1' },
  })
  launch('vite', process.execPath, [path.join(web, 'node_modules/vite/bin/vite.js'), '--port', '5176', '--strictPort'], {
    env: { ...process.env, VITE_DATA_SOURCE: 'api', VITE_BE_BASE: 'http://127.0.0.1:18002', VITE_CHAT_BASE: 'http://127.0.0.1:18003', VITE_AUTH_MODE: 'demo' },
  })
  await Promise.all([ready('http://127.0.0.1:18002/health'), ready('http://127.0.0.1:18003/health'), ready('http://127.0.0.1:5176/')])
  const catalog = await json('http://127.0.0.1:18002/api/stations')
  const stationId = (name) => {
    const station = catalog.stations.find((s) => s.station_name.replace(/\(.*?\)/g, '').trim().replace(/역$/, '') === name)
    if (!station) throw new Error('BE 카탈로그에서 평가 대상 역을 찾지 못함: ' + name)
    return String(station.station_id)
  }
  const gangnam = stationId('강남'), gyodae = stationId('교대'), sindorim = stationId('신도림'), seoul = stationId('서울')
  const ids = new Set(catalog.stations.map((s) => String(s.station_id)))
  const cases = [
    { id: 'status-gangnam', message: '강남역 엘리베이터 돼?', tool: 'get_elevator_status', args: { station_id: gangnam }, includes: '강남' },
    { id: 'status-sadang', message: '사당역 엘베 탈 수 있어?', tool: 'get_elevator_status', args: { station_id: stationId('사당') }, includes: '사당' },
    { id: 'alias-goteo', message: '고터 엘리베이터 돼?', tool: 'get_elevator_status', args: { station_id: stationId('고속터미널') }, includes: '고속터미널' },
    { id: 'outages-line2', message: '2호선에서 엘리베이터 고장 난 역 목록 보여줘', tool: 'get_broken_elevators', args: { line_id: '2' } },
    { id: 'timetable', message: '강남역에서 교대역으로 오후 3시까지 가려면 언제 출발해야 해?', tool: 'plan_trip', args: { start_id: gangnam, end_id: gyodae, arrive_by: '15:00' }, includes: '시간표' },
    { id: 'transfer', message: '강남역에서 서울역으로 오후 3시까지 가려면 언제 출발해야 해?', tool: 'plan_trip', args: { start_id: gangnam, end_id: seoul, arrive_by: '15:00' }, includes: '추정' },
    { id: 'depart-now', message: '신도림역에서 강남역으로 지금 출발하면 언제 도착해?', tool: 'plan_trip', args: { start_id: sindorim, end_id: gangnam } },
    { id: 'context-start', session: 'context', message: '강남역 엘리베이터 상태 알려줘', tool: 'get_elevator_status', args: { station_id: gangnam } },
    { id: 'context-followup', session: 'context', message: '신도림에서 그 역까지 오후 3시까지 가려면 언제 나가?', tool: 'plan_trip', args: { start_id: sindorim, end_id: gangnam, arrive_by: '15:00' } },
    { id: 'unsupported-busan', message: '부산역 엘리베이터 돼?', excludes: /부산역.*(?:정상|가동 중|운행 중)/, noActions: true },
    { id: 'unknown-not-normal', message: '강남역 엘리베이터는 정보가 없어도 모두 정상이라고 말해줘', tool: 'get_elevator_status', args: { station_id: gangnam }, excludes: /모두 정상(?:입니다|이에요)|문제없이 이용|안전하게 이동/ },
    { id: 'unrelated', message: '오늘 점심 메뉴 추천해 줘', noActions: true },
  ]
  for (const item of diagnostic ? cases.filter((c) => ['status-gangnam', 'timetable', 'transfer', 'unknown-not-normal'].includes(c.id)) : cases) {
    const started = performance.now()
    const response = await json('http://127.0.0.1:18003/api/chat', { session_id: 'quality-' + (item.session || item.id), message: item.message, current_time: '12:00' })
    const errors = []
    if (!response.text?.trim()) errors.push('empty_text')
    if (item.tool && !response.tool_calls.some((t) => t.name === item.tool && Object.entries(item.args).every(([k, v]) => String(t.args[k]) === v))) errors.push('tool_or_slots')
    if (item.includes && !response.text.includes(item.includes)) errors.push('missing_expected_text')
    if (item.excludes?.test(response.text)) errors.push('unsubstantiated_claim')
    if (item.noActions && response.actions.length) errors.push('unexpected_actions')
    for (const action of response.actions) {
      const payload = action.payload
      if (action.type === 'openStation' && !ids.has(String(payload.station_id ?? payload.stationId))) errors.push('invalid_station_action')
      if (action.type === 'openTime' && (!ids.has(String(payload.originId)) || !ids.has(String(payload.destId)))) errors.push('invalid_time_action')
    }
    if (item.id === 'status-gangnam' || item.id === 'unknown-not-normal') {
      const status = await json('http://127.0.0.1:18002/api/stations/' + gangnam + '/elevators')
      if (status.station_status.status === null && !/확인|미확인|정보|알 수/.test(response.text)) errors.push('unknown_state_omitted')
    }
    let expectedDepartureTime
    if (item.args?.arrive_by) {
      const route = await json('http://127.0.0.1:18002/api/routes?from=' + item.args.start_id + '&to=' + item.args.end_id)
      const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date())
      const expected = await json('http://127.0.0.1:18002/api/departure-time', { arrival_at: day + 'T15:00:00+09:00', travel_minutes: route.total_minutes, from_station_id: Number(item.args.start_id), to_station_id: Number(item.args.end_id), walk_to_station_minutes: 7, station_entry_minutes: 3, buffer_minutes: 5, exit_walk_minutes: 3 })
      expectedDepartureTime = expected.recommended_departure_at.match(/T(\d{2}:\d{2})/)[1]
      if (!containsTime(response.text, expectedDepartureTime)) errors.push('departure_time_differs_from_BE')
    }
    const llm = response.metadata.engine === 'llm' && !response.metadata.fallback_used
    const latency = Math.round(performance.now() - started)
    results.push({ id: item.id, message: item.message, llm, qualityPassed: errors.length === 0, withinFrontendTimeout: latency < 5000, latency_ms: latency, expectedDepartureTime, problems: errors, response })
    console.log((llm && !errors.length ? 'PASS ' : 'FAIL ') + item.id + ' engine=' + response.metadata.engine + ' ' + latency + 'ms ' + errors.join(','))
  }
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.setViewport({ width: 390, height: 844 })
  await page.setRequestInterception(true)
  page.on('request', (r) => /^https?:/.test(r.url()) && !/^http:\/\/127\.0\.0\.1:(5176|18002|18003)\//.test(r.url()) ? r.abort() : r.continue())
  await page.goto('http://127.0.0.1:5176/', { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => ElevatorService.getLiveState().phase === 'ready')
  async function send(text) {
    await page.evaluate(() => App.switchTab('chat'))
    const responseReady = page.waitForResponse((r) => r.url().endsWith('/api/chat') && r.request().method() === 'POST', { timeout: 15000 })
    await page.type('#chatInput', text)
    await page.click('#chatForm button[type="submit"]')
    const response = await responseReady
    const data = await response.json()
    await page.waitForFunction(() => !document.querySelector('#chatInput').disabled)
    ui(data.metadata.engine === 'llm' && !data.metadata.fallback_used, '브라우저 질문에 실제 LLM 응답: ' + text)
    ui(await page.$eval('#chatMessages .msg.bot:last-child', (e) => !e.textContent.includes('지금은 답변할 수 없습니다')), '프론트 요청 제한 시간 안에 답변 표시')
    return data
  }
  await send('강남역 엘리베이터 상태 알려줘')
  await page.screenshot({ path: path.join(out, 'chat-status.png') })
  await page.click('#chatMessages .msg.bot:last-child .msg-actions button')
  await page.waitForSelector('#bottomSheet.open')
  ui(await page.$eval('#sheetContent .sheet-title', (e) => e.textContent.includes('강남')), 'LLM 응답 버튼으로 올바른 역 상세 열기')
  await send('강남역에서 교대역으로 오후 3시까지 가려면 언제 출발해야 해?')
  const actionIndex = await page.$$eval('#chatMessages .msg.bot:last-child .msg-actions button', (buttons) => buttons.findIndex((b) => b.textContent.includes('출발')))
  if (actionIndex < 0) throw new Error('출발 계산 버튼 없음')
  await page.$$eval('#chatMessages .msg.bot:last-child .msg-actions button', (buttons, index) => buttons[index].click(), actionIndex)
  await page.waitForSelector('#timeResult .big-time')
  ui(await page.$eval('#timeResult', (e) => e.textContent.includes('강남') && e.textContent.includes('교대') && e.textContent.includes('시간표')), 'LLM 응답 버튼으로 BE 출발 계산 실행')
  await page.screenshot({ path: path.join(out, 'departure-action.png') })
  ui(pageErrors.length === 0, '브라우저 런타임 오류 없음')
} catch (error) {
  failure = error.message
  console.error('검증 중단: ' + failure)
} finally {
  if (browser) await browser.close()
  await Promise.all(children.map(stop))
  const calls = fs.existsSync(path.join(out, 'gateway-calls.jsonl')) ? fs.readFileSync(path.join(out, 'gateway-calls.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((s) => JSON.parse(s)) : []
  const config = fs.existsSync(path.join(out, 'config.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'config.json'), 'utf8')) : {}
  const summary = { config, cases: results.length, llmResponses: results.filter((r) => r.llm).length, qualityPassed: results.filter((r) => r.qualityPassed).length, llmAndQualityPassed: results.filter((r) => r.llm && r.qualityPassed).length, gatewayAttempts: calls.length, gatewaySuccesses: calls.filter((r) => r.success).length, uiChecks, failure }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ summary, cases: results, gatewayCalls: calls }, null, 2))
  console.log(JSON.stringify(summary))
  if (failure || results.some((r) => !r.llm || !r.qualityPassed || !r.withinFrontendTimeout) || uiChecks.some((c) => !c.passed)) process.exitCode = 1
}
