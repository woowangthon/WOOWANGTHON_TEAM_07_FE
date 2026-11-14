// 기존 브라우저 테스트(tests/browser-*.cjs)는 PUPPETEER_MODULE로 puppeteer를 받는다.
// puppeteer-core는 브라우저를 내려받지 않으므로 설치된 Chrome 경로를 기본값으로 넣어 준다.
const p = require('puppeteer-core')
const CHROME = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome')
module.exports = Object.assign(Object.create(p), {
  launch: (opts) => p.launch(Object.assign({ executablePath: CHROME }, opts)),
})
