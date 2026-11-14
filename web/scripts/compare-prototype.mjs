// 원본과 React의 동일 화면을 저장하고 픽셀 차이를 측정한다.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import puppeteer from 'puppeteer-core'

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(web, 'artifacts/migration')
fs.mkdirSync(out, { recursive: true })
const preview = spawn(process.execPath, [path.join(web, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4174', '--strictPort'], { cwd: web, stdio: 'ignore' })
let browser
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch('http://127.0.0.1:4174/')).ok) break } catch { /* 서버 준비 중 */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] })
  const results = []
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const pages = []
    for (const url of [pathToFileURL(path.resolve(web, '../Prototype-v2/index.html')).href, 'http://127.0.0.1:4174/']) {
      const page = await browser.newPage()
      await page.setViewport(viewport)
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
      await page.setRequestInterception(true)
      page.on('request', (r) => /^https?:/.test(r.url()) && !r.url().startsWith('http://127.0.0.1:4174/') ? r.abort() : r.continue())
      await page.goto(url, { waitUntil: 'load' })
      await page.addStyleTag({ content: '* { transition: none !important; animation: none !important; scroll-behavior: auto !important; }' })
      await page.waitForFunction(() => !!window.App && document.querySelectorAll('#originSelect option').length > 5)
      pages.push(page)
    }
    for (const state of ['map', 'sheet-peek', 'sheet-full', 'elevator', 'time', 'time-result', 'time-graphic', 'chat', 'account']) {
      const images = []
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        await page.bringToFront()
        await page.evaluate((state) => {
          App.closeSheet()
          if (state.startsWith('sheet')) {
            App.openStation('gangnam')
          } else if (state.startsWith('time')) {
            App.openTime({ originId: 'sindorim', destId: 'gangnam', arriveBy: '16:00' })
          } else if (state === 'account') {
            AuthService.login('google')
            App.switchTab('login')
          } else App.switchTab(state)
        }, state)
        if (state === 'time-result') await page.$eval('#view-time .view-scroll', (el) => { el.scrollTop = document.getElementById('timeForm').offsetHeight })
        if (state === 'time-graphic') await page.$eval('#view-time .view-scroll', (el) => { el.scrollTop = el.scrollHeight })
        if (state === 'sheet-full') await page.$eval('#sheetHandle', (el) => el.click())
        await page.evaluate(() => { document.getAnimations().forEach((a) => { if (a.effect.getComputedTiming().iterations !== Infinity) a.finish() }) })
        await new Promise((r) => setTimeout(r, 450))
        const file = viewport.width + '-' + state + '-' + (i ? 'react' : 'prototype') + '.png'
        images.push(Buffer.from(await page.screenshot({ path: path.join(out, file), waitForFonts: false })).toString('base64'))
      }
      const comparison = await pages[1].evaluate(async ([a, b]) => {
        const load = async (src) => { const image = new Image(); image.src = 'data:image/png;base64,' + src; await image.decode(); return image }
        const left = await load(a), right = await load(b)
        const c = document.createElement('canvas'); c.width = left.width; c.height = left.height
        const ctx = c.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(left, 0, 0); const p = ctx.getImageData(0, 0, c.width, c.height)
        ctx.drawImage(right, 0, 0); const q = ctx.getImageData(0, 0, c.width, c.height)
        let changed = 0
        for (let i = 0; i < p.data.length; i += 4) {
          const diff = Math.max(Math.abs(p.data[i] - q.data[i]), Math.abs(p.data[i + 1] - q.data[i + 1]), Math.abs(p.data[i + 2] - q.data[i + 2]))
          if (diff > 20) { changed++; q.data[i] = 255; q.data[i + 1] = 0; q.data[i + 2] = 100 }
          else { q.data[i] = q.data[i + 1] = q.data[i + 2] = 255 }
        }
        ctx.putImageData(q, 0, 0)
        return { changedPercent: 100 * changed / (c.width * c.height), diff: c.toDataURL('image/png').split(',')[1] }
      }, images)
      fs.writeFileSync(path.join(out, viewport.width + '-' + state + '-diff.png'), Buffer.from(comparison.diff, 'base64'))
      results.push({ width: viewport.width, state, changedPercent: Number(comparison.changedPercent.toFixed(3)) })
      console.log(viewport.width + ' ' + state + ': ' + comparison.changedPercent.toFixed(3) + '%')
    }
    for (const page of pages) await page.close()
  }
  fs.writeFileSync(path.join(out, 'comparison.json'), JSON.stringify(results, null, 2))
} finally { if (browser) await browser.close(); preview.kill() }
