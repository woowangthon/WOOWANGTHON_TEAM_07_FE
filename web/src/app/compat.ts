// window.App 호환: 기존 브라우저 테스트와 legacy 코드가 쓰는 8개 함수. 서명·반환 형식은 app.js와 같다.
// escapeHtml/lineBadges/statusPill은 HTML 문자열을 돌려준다.
import type { AppApi } from './context'
import { escapeHtml, lineBadges, statusPill } from '../lib/html'

export function installCompat(api: Pick<AppApi, 'openStation' | 'switchTab' | 'toast' | 'openTime' | 'closeSheet'>): () => void {
  const app = {
    openStation: (id: string) => api.openStation(id),
    switchTab: (name: string) => api.switchTab(name),
    toast: (msg: unknown) => api.toast(msg),
    openTime: (opts?: Parameters<AppApi['openTime']>[0]) => api.openTime(opts),
    closeSheet: () => api.closeSheet(),
    escapeHtml,
    lineBadges,
    statusPill,
  }
  window.App = app
  return () => { if (window.App === app) delete window.App }
}
