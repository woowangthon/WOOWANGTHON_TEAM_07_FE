/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Prototype-v2의 서비스 JS와 CSS를 고치지 않고 /legacy/ 경로로 그대로 제공한다.
// 일반 <script>로 불러와야 기존 전역(window.ElevatorService 등)과 non-strict 동작이 그대로 유지된다.
const LEGACY_ROOT = path.resolve(__dirname, '../Prototype-v2')
const LEGACY_DIRS = ['js', 'css']

function legacyAssets(): Plugin {
  return {
    name: 'legacy-prototype-assets',
    configureServer(server) {
      server.middlewares.use('/legacy', (req, res, next) => {
        const rel = decodeURIComponent((req.url || '').split('?')[0]).replace(/^\/+/, '')
        const top = rel.split('/')[0]
        const file = path.resolve(LEGACY_ROOT, rel)
        if (!LEGACY_DIRS.includes(top) || !file.startsWith(LEGACY_ROOT + path.sep) || !fs.existsSync(file)) return next()
        res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8')
        fs.createReadStream(file).pipe(res)
      })
    },
    closeBundle() {
      const out = path.resolve(__dirname, 'dist/legacy')
      for (const dir of LEGACY_DIRS) {
        fs.cpSync(path.join(LEGACY_ROOT, dir), path.join(out, dir), { recursive: true })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), legacyAssets()],
  server: { port: 5173, host: '127.0.0.1' },
  preview: { port: 4173, host: '127.0.0.1' },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
})
