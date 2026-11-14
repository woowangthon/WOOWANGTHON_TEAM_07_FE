// 실제 마이크·TTS 서버를 사용하지 않는 Chrome 통합 검증. 먼저 npm run build:mock.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(web, 'artifacts/chat-voice')
fs.mkdirSync(out, { recursive: true })
const url = 'http://127.0.0.1:4178/'
const preferences = { version: 1, font: 'normal', contrast: false, simple: false, touch: false, motion: false, stepFree: false }
const preview = spawn(process.execPath, [path.join(web, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4178', '--strictPort'], { cwd: web, stdio: 'ignore' })
let browser
const results = []
try {
  let available = false
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url)).ok) { available = true; break } } catch { /* 준비 중 */ }
    await new Promise(r => setTimeout(r, 250))
  }
  assert(available, 'preview startup failed')
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })
  await page.evaluateOnNewDocument(prefs => {
    localStorage.setItem('elevSubway.accessibility.v1', JSON.stringify(prefs))
    window.__speech = { spoken: [], canceled: 0 }
    class Recognition {
      start() { window.__recognition = this }
      stop() { this.onend?.() }
      abort() { window.__speech.aborted = true }
    }
    class Utterance { constructor(text) { this.text = text } }
    const synth = Object.assign(new EventTarget(), {
      getVoices: () => [{ lang: 'ko-KR', localService: true }],
      speak: utterance => { window.__speech.spoken.push(utterance.text) },
      cancel: () => { window.__speech.canceled++ },
    })
    Object.defineProperty(window, 'SpeechRecognition', { value: Recognition, configurable: true })
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true })
  }, preferences)
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.bringToFront()
  await page.waitForFunction(() => typeof window.App?.switchTab === 'function')
  await page.evaluate(() => {
    App.switchTab('chat')
    window.__questions = []
    AIAgent.processMessage = async text => {
      window.__questions.push(text)
      return { text: '강남역 엘리베이터 정보예요. 승강장부터 출구까지의 접근성은 확인이 필요해요. 2026년 11월 15일 오전 06:11에 수집된 정보예요.', toolCalls: [{ name: 'get_elevator_status' }], actions: [{ type: 'openStation', label: '강남역 상세 보기', payload: 'gangnam' }] }
    }
  })
  await page.click('[aria-label="말로 질문하기"]')
  assert.equal(await page.evaluate(() => !!window.__recognition), false, 'consent precedes microphone')
  await page.screenshot({ path: path.join(out, 'voice-consent.png'), waitForFonts: false })
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === '음성 입력 시작').click())
  await page.evaluate(() => window.__recognition.onresult({ results: [{ 0: { transcript: '강남역 엘리베이터' }, length: 1, isFinal: false }] }))
  assert.equal(await page.$eval('#chatInput', el => el.value), '강남역 엘리베이터')
  await page.evaluate(() => {
    const r = window.__recognition
    r.onresult({ results: [{ 0: { transcript: '강남역 엘리베이터 돼?' }, length: 1, isFinal: true }] })
    const end = r.onend; end(); end()
  })
  await page.waitForFunction(() => window.__speech.spoken.length === 1)
  assert.deepEqual(await page.evaluate(() => window.__questions), ['강남역 엘리베이터 돼?'])
  assert.equal(await page.$$eval('.tool-chip', el => el.length), 0)
  assert((await page.evaluate(() => window.__speech.spoken[0])).includes('접근성은 확인이 필요해요'))
  await page.click('[aria-label="읽기 멈추기"]')
  assert.equal(await page.evaluate(() => window.__speech.canceled), 1)
  results.push('consent, interim, one submission, automatic Korean TTS, warning/time retention, stop')
  for (const width of [320, 390]) {
    await page.setViewport({ width, height: 844 })
    for (const font of ['normal', 'lg', 'xl', 'max']) {
      await page.evaluate(font => { document.documentElement.setAttribute('data-fontsize', font) }, font)
      const layout = await page.evaluate(() => {
        const view = document.querySelector('#view-chat').getBoundingClientRect()
        const buttons = [...document.querySelectorAll('#chatForm button')].map(el => el.getBoundingClientRect())
        return { overflow: document.documentElement.scrollWidth > innerWidth, valid: buttons.every(b => b.width >= 44 && b.height >= 44 && b.left >= view.left && b.right <= view.right + 1) }
      })
      assert.equal(layout.overflow, false, `overflow ${width} ${font}`)
      assert.equal(layout.valid, true, `tap target ${width} ${font}`)
      await page.screenshot({ path: path.join(out, `chat-${width}-${font}.png`), waitForFonts: false })
    }
  }
  await page.evaluate(() => App.switchTab('map'))
  results.push('320px/390px, four font sizes, minimum 44px buttons, no horizontal overflow')
  await browser.close(); browser = null

  // 첫 화면이 별도 개발 중이어도 기존 앱 회귀를 확인하도록 저장된 기본 접근성 설정만 주입한다.
  const driver = path.join(out, 'baseline-driver.cjs')
  fs.writeFileSync(driver, `const p = require(${JSON.stringify(path.join(web, 'scripts/puppeteer-chrome.cjs'))});
module.exports = Object.assign(Object.create(p), { launch: async options => {
  const browser = await p.launch(options); const newPage = browser.newPage.bind(browser);
  browser.newPage = async (...args) => { const page = await newPage(...args);
    await page.evaluateOnNewDocument(prefs => localStorage.setItem('elevSubway.accessibility.v1', JSON.stringify(prefs)), ${JSON.stringify(preferences)});
    return page; }; return browser;
} });\n`)
  if (process.argv.includes('--legacy')) {
    const failures = []
    for (const file of fs.readdirSync(path.join(web, '../tests')).filter(f => /^browser-.*\.cjs$/.test(f)).sort()) {
      await new Promise(resolve => {
        const child = spawn(process.execPath, [path.join(web, '../tests', file)], { cwd: path.resolve(web, '..'), env: { ...process.env, APP_FILE: url, PUPPETEER_MODULE: driver }, stdio: ['ignore', 'pipe', 'pipe'] })
        let output = ''
        child.stdout.on('data', data => { output += data })
        child.stderr.on('data', data => { output += data })
        child.on('close', code => {
          fs.writeFileSync(path.join(out, file + '.log'), output)
          console.log((code === 0 ? 'PASS ' : 'FAIL ') + file)
          if (code === 0) results.push(file)
          else { failures.push(file); console.error(output) }
          resolve()
        })
      })
    }
    assert.deepEqual(failures, [], 'legacy browser regressions')
  }
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ simulatedSpeech: true, physicalMicrophoneTested: false, results }, null, 2))
  console.log('PASS chat voice browser integration: ' + results.join('; '))
} finally {
  if (browser) await browser.close()
  preview.kill()
}
