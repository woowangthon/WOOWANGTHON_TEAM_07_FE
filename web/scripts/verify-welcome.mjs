// 로컬 개발 서버를 켜고 실행: node scripts/verify-welcome.mjs
import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const puppeteer = require('./puppeteer-chrome.cjs')
const browser = await puppeteer.launch({ headless: true })
const output = new URL('../artifacts/welcome/', import.meta.url)
await mkdir(output, { recursive: true })
try {
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  // 외부 폰트 없이도 글자와 기본 컨트롤이 동작해야 한다.
  await page.setRequestInterception(true)
  page.on('request', (request) => request.url().startsWith('http://127.0.0.1:5178') || request.url().startsWith('file:') ? request.continue() : request.abort())
  await page.setViewport({ width: 1440, height: 1000 })
  await page.goto('http://127.0.0.1:5178', { waitUntil: 'networkidle0' })
  await page.waitForSelector('.welcome-primary')
  await page.screenshot({ path: new URL('landing-desktop.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  await page.click('.welcome-primary')
  console.log('설정 화면 진입')
  await page.click('input[value="max"]')
  for (const index of [0, 1, 2, 3, 4]) await page.locator(`.welcome-option:nth-child(${index + 1})`).click()
  console.log('설정 선택 완료')
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewport({ width, height: 900 })
    const geometry = await page.$eval('.welcome-shell', (element) => ({ width: element.clientWidth, scroll: element.scrollWidth }))
    assert(geometry.scroll <= geometry.width, `설정 화면 가로 넘침: ${width}, ${JSON.stringify(geometry)}`)
  }
  await page.setViewport({ width: 375, height: 900 })
  await page.screenshot({ path: new URL('settings-mobile-max.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  await page.locator('.welcome-setup button[type="submit"]').click()
  await page.waitForSelector('.welcome-tasks')
  console.log('쉬운 첫 화면 진입')
  await page.reload({ waitUntil: 'networkidle0' })
  assert(await page.$('.welcome-tasks'), '설정 복원 실패')
  await page.locator('.welcome-tasks button').click()
  await page.waitForSelector('#view-elevator.active')
  console.log('앱 연결 완료')
  assert.equal(await page.$('.access-tools'), null, '이전 두 버튼 바 제거')
  const placement = await page.$eval('.welcome-return button', (element) => {
    const button = element.getBoundingClientRect(), phone = document.getElementById('phone').getBoundingClientRect()
    return { buttonCenter: button.x + button.width / 2, phoneCenter: phone.x + phone.width / 2 }
  })
  assert(Math.abs(placement.buttonCenter - placement.phoneCenter) < 1, '맞춤 화면 진입점을 폰 중앙에 배치')
  await page.click('.tab[data-tab="chat"]')
  await page.type('#chatInput', '설정 중에도 보존되는 질문')
  await page.click('.welcome-return button')
  assert(await page.$('.welcome-intro'), '랜딩 안에서 설정')
  await page.locator('.welcome-back').click()
  assert.equal(await page.$eval('#chatInput', (element) => element.value), '설정 중에도 보존되는 질문')
  assert(await page.$('#view-chat.active'), '이용 중인 탭 보존')
  await page.click('.welcome-return button')
  await page.locator('.welcome-setup button[type="submit"]').click()
  await page.locator('.welcome-tasks button:nth-child(3)').click()
  await page.waitForSelector('#view-map.active')
  await page.screenshot({ path: new URL('app-mobile-max.png', output).pathname.replace(/^\/(\w:)/, '$1'), fullPage: true })
  assert.deepEqual(errors, [])
  // 보존 기준인 이전 프로토타입도 열어 화면/스크립트 초기화를 확인한다.
  const prototype = await browser.newPage()
  await prototype.goto(new URL('../../Prototype-v2/index.html', import.meta.url).href, { waitUntil: 'load' })
  assert(await prototype.$('#phone'))
  console.log('PASS: 랜딩, 최대 글씨 4개 화면 폭, 설정 복원, 기능 연결, 입력 보존, 이전 프로토타입 초기화')
} finally { await browser.close() }
