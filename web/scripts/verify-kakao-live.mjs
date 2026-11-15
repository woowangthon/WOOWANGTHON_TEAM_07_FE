// 실행 중인 FE(:5173)·BE(:8000)의 실제 카카오 로그인 진입 검증.
// 키·Secret·인증 URL·쿠키·비밀번호를 출력하거나 저장하지 않는다.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require('./puppeteer-chrome.cjs')
const browser = await puppeteer.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:5173/#/main', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.App?.switchTab === 'function' && window.AuthService?.getSession() !== null)
  assert.equal(await page.evaluate(() => window.APP_CONFIG.authMode), 'real')
  const ready = await page.evaluate(async () => {
    const response = await fetch('http://127.0.0.1:8000/api/auth/providers', { credentials: 'include' })
    return response.json()
  })
  assert(ready.providers.kakao.configured, '카카오 REST API 키 설정 필요')
  assert(ready.storage_ready, '계정 DB 준비 필요')
  await page.evaluate(() => window.App.switchTab('login'))
  await page.click('.auth-btn[data-provider="kakao"]')
  await page.waitForFunction(() => ['accounts.kakao.com', 'kauth.kakao.com'].includes(location.hostname), { timeout: 30000 })
  await page.waitForFunction(() => /\bKOE\d{3}\b/.test(document.body.innerText) ||
    document.querySelector('input[name="loginId"], input[name="email"], input[type="password"]'), { timeout: 20000 }).catch(() => {})
  const result = await page.evaluate(() => ({
    kakao_page: ['accounts.kakao.com', 'kauth.kakao.com'].includes(location.hostname),
    login_form_visible: !!document.querySelector('input[name="loginId"], input[name="email"], input[type="password"]'),
    error: document.body.innerText.match(/\bKOE\d{3}\b/)?.[0] || null,
  }))
  console.log(JSON.stringify(result))
  assert.equal(result.error, null, '카카오 앱 설정 확인 필요')
  assert(result.login_form_visible, '카카오 계정 로그인 입력 화면 표시')
  console.log('PASS: 카카오 버튼·준비 상태·실제 카카오 계정 로그인 화면 진입. 사용자 로그인/동의는 직접 진행해야 합니다.')
} finally {
  await browser.close()
}
